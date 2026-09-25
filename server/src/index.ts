import { WebSocketServer, WebSocket } from 'ws'

// ---------------------------------------------------------------------------
// Fastest Fingers room server. No accounts, no persistence: rooms live in
// memory and vanish when empty. Run with `npm start` (PORT env, default 4001).
// ---------------------------------------------------------------------------

const PORT = Number(process.env.PORT || 4001)
const MAX_PLAYERS = 6
const RACE_WORDS = 24
const FINISH_TIMEOUT_MS = 45000

// Compact pools (client carries the full lists; these only need >= RACE_WORDS).
const EN = ('the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or will my one all would there their what so up out if about who get which go me when make can like time just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us water house school friend book light').split(' ')
const NE = ('नेपाल काठमाडौं पोखरा चितवन झापा दमक पानी आगो हावा माटो आकाश घर भात दाल आमा बुबा गाउँ सहर पैसा काम स्कुल किताब माया खुशी खाना बाटो गाडी कुकुर रातो आज भोलि खानु जानु आउनु गर्नु दिनु एक दुई तीन चार पाँच म तिमी हामी').split(' ')

type Phase = 'lobby' | 'countdown' | 'racing' | 'done'

interface Player {
  id: string
  name: string
  ws: WebSocket
  progress: number
  wpm: number
  finished: boolean
  acc: number
}

interface Room {
  code: string
  lang: 'en' | 'ne'
  phase: Phase
  players: Map<string, Player>
  hostId: string | null
  words: string[]
  finishTimer: NodeJS.Timeout | null
}

const rooms = new Map<string, Room>()

function rid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function code(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let c = ''
  for (let i = 0; i < 5; i++) c += chars[Math.floor(Math.random() * chars.length)]
  return rooms.has(c) ? code() : c
}

function sample(pool: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < RACE_WORDS; i++) out.push(pool[Math.floor(Math.random() * pool.length)])
  return out
}

function send(ws: WebSocket, msg: object): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
}

function pub(room: Room): object[] {
  return [...room.players.values()].map((p) => ({
    id: p.id,
    name: p.name,
    host: p.id === room.hostId,
    progress: Math.round(p.progress * 1000) / 1000,
    wpm: p.wpm,
    finished: p.finished,
  }))
}

function broadcast(room: Room, msg: object): void {
  for (const p of room.players.values()) send(p.ws, msg)
}

function roomState(room: Room): object {
  return { t: 'room', room: room.code, phase: room.phase, players: pub(room) }
}

function sync(room: Room): void {
  broadcast(room, roomState(room))
}

function closeFinishTimer(room: Room): void {
  if (room.finishTimer) {
    clearTimeout(room.finishTimer)
    room.finishTimer = null
  }
}

function finishAll(room: Room): void {  closeFinishTimer(room)
  room.phase = 'done'
  const board = [...room.players.values()]
    .map((p) => ({ name: p.name, wpm: p.wpm, acc: p.acc, finished: p.finished }))
    .sort((a, b) => b.wpm - a.wpm || b.acc - a.acc)
  broadcast(room, { t: 'results', board })
  sync(room)
}

const contexts = new Map<WebSocket, { room: Room; id: string }>()

function handle(ws: WebSocket, raw: string): void {
  let msg: Record<string, unknown>
  try {
    msg = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return
  }
  const kind = msg.t as string | undefined
  const ctx = contexts.get(ws)
  const name = typeof msg.name === 'string' ? msg.name.trim().slice(0, 16) : ''

  if (kind === 'create') {
    if (!name) return send(ws, { t: 'error', message: 'Name required.' })
    const lang = msg.lang === 'ne' ? 'ne' : 'en'
    const room: Room = {
      code: code(),
      lang,
      phase: 'lobby',
      players: new Map(),
      hostId: null,
      words: [],
      finishTimer: null,
    }
    const id = rid()
    room.players.set(id, { id, name, ws, progress: 0, wpm: 0, finished: false, acc: 100 })
    room.hostId = id
    rooms.set(room.code, room)
    contexts.set(ws, { room, id })
    send(ws, { t: 'joined', room: room.code, you: id, lang })
    sync(room)
    return
  }

  if (kind === 'join') {
    const target = typeof msg.room === 'string' ? msg.room.trim().toUpperCase() : ''
    const room = rooms.get(target)
    if (!room) return send(ws, { t: 'error', message: 'Room not found. Check the code.' })
    if (!name) return send(ws, { t: 'error', message: 'Name required.' })
    if (room.phase !== 'lobby') return send(ws, { t: 'error', message: 'Race already started.' })
    if (room.players.size >= MAX_PLAYERS) return send(ws, { t: 'error', message: 'Room is full.' })
    const id = rid()
    room.players.set(id, { id, name, ws, progress: 0, wpm: 0, finished: false, acc: 100 })
    if (!room.hostId) room.hostId = id
    contexts.set(ws, { room, id })
    send(ws, { t: 'joined', room: room.code, you: id, lang: room.lang })
    sync(room)
    return
  }

  if (!ctx) return
  const { room, id } = ctx
  const me = room.players.get(id)
  if (!me) return

  if (kind === 'start') {
    if (id !== room.hostId) return send(ws, { t: 'error', message: 'Only the host starts.' })
    if (room.phase !== 'lobby') return
    if (room.players.size < 2) {
      return send(ws, { t: 'error', message: 'Need at least 2 racers.' })
    }
    room.phase = 'countdown'
    room.words = sample(room.lang === 'ne' ? NE : EN)
    for (const p of room.players.values()) {
      p.progress = 0
      p.wpm = 0
      p.finished = false
      p.acc = 100
    }
    broadcast(room, { t: 'countdown', at: Date.now() + 3200, words: room.words })
    sync(room)
    return
  }

  if (kind === 'progress') {
    if (room.phase !== 'racing' && room.phase !== 'countdown') return
    if (room.phase === 'countdown') room.phase = 'racing'
    const p = typeof msg.p === 'number' ? Math.max(0, Math.min(1, msg.p)) : me.progress
    me.progress = p
    if (typeof msg.wpm === 'number' && Number.isFinite(msg.wpm)) {
      me.wpm = Math.max(0, Math.min(400, Math.round(msg.wpm)))
    }
    broadcast(room, {
      t: 'positions',
      positions: [...room.players.values()].map((x) => ({
        id: x.id,
        p: x.progress,
        wpm: x.wpm,
        finished: x.finished,
      })),
    })
    return
  }

  if (kind === 'finish') {
    me.finished = true
    me.progress = 1
    if (typeof msg.wpm === 'number' && Number.isFinite(msg.wpm)) {
      me.wpm = Math.max(0, Math.min(400, Math.round(msg.wpm)))
    }
    if (typeof msg.acc === 'number' && Number.isFinite(msg.acc)) {
      me.acc = Math.max(0, Math.min(100, Math.round(msg.acc)))
    }
    const remaining = [...room.players.values()].filter((x) => !x.finished)
    if (remaining.length === 0) {
      finishAll(room)
    } else {
      if (!room.finishTimer) {
        room.finishTimer = setTimeout(() => finishAll(room), FINISH_TIMEOUT_MS)
      }
      sync(room)
    }
    return
  }

  if (kind === 'leave') {
    drop(ws)
  }
}

function drop(ws: WebSocket): void {
  const ctx = contexts.get(ws)
  if (!ctx) return
  contexts.delete(ws)
  const { room, id } = ctx
  room.players.delete(id)
  if (room.players.size === 0) {
    closeFinishTimer(room)
    rooms.delete(room.code)
    return
  }
  if (room.hostId === id) {
    room.hostId = [...room.players.keys()][0] ?? null
  }
  sync(room)
}

const wss = new WebSocketServer({ port: PORT })
wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (data: Buffer) => handle(ws, data.toString()));
  ws.on('close', () => drop(ws));
  ws.on('error', () => {
    try {
      ws.close();
    } catch {
      /* already gone */
    }
  });
});

// Sweep abandoned rooms every 10 minutes (safety net).
setInterval(() => {
  for (const [c, room] of rooms) {
    let alive = false
    for (const p of room.players.values()) {
      if (p.ws.readyState === WebSocket.OPEN) {
        alive = true
        break
      }
    }
    if (!alive) {
      closeFinishTimer(room)
      rooms.delete(c)
    }
  }
}, 10 * 60 * 1000);

console.log(`fastest-fingers rooms on :${PORT}`);
