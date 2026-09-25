import { useCallback, useEffect, useRef, useState } from 'react'
import type { Language } from './race'

export type ServerUrl = string

export interface NetPlayer {
  id: string
  name: string
  host: boolean
  progress: number
  wpm: number
  finished: boolean
}

export interface BoardRow {
  name: string
  wpm: number
  acc: number
  finished: boolean
}

export type NetStatus =
  | 'idle'
  | 'connecting'
  | 'lobby'
  | 'countdown'
  | 'racing'
  | 'done'
  | 'closed'
  | 'error'

interface Incoming {
  t: string
  [k: string]: unknown
}

const DEFAULT_URL =
  (import.meta.env.VITE_RACE_SERVER as string | undefined) || 'ws://localhost:4001'

export function serverUrl(): string {
  return DEFAULT_URL
}

/** Minimal room client: connect, create/join, start, positions, results. */
export function useNetRoom() {
  const wsRef = useRef<WebSocket | null>(null)
  const [status, setStatus] = useState<NetStatus>('idle')
  const [room, setRoom] = useState('')
  const [youId, setYouId] = useState('')
  const [lang, setLang] = useState<Language>('en')
  const [players, setPlayers] = useState<NetPlayer[]>([])
  const [words, setWords] = useState<string[]>([])
  const [goAt, setGoAt] = useState<number | null>(null)
  const [board, setBoard] = useState<BoardRow[]>([])
  const [error, setError] = useState('')
  const lastSent = useRef(0)

  const close = useCallback(() => {
    try {
      wsRef.current?.close()
    } catch {
      /* already gone */
    }
    wsRef.current = null
  }, [])

  useEffect(() => close, [close])

  const applyRoom = useCallback((msg: Incoming) => {
    const list = (msg.players as NetPlayer[] | undefined) ?? []
    setPlayers(list)
    const phase = msg.phase as string | undefined
    if (phase === 'lobby') setStatus('lobby')
  }, [])

  const send = useCallback((msg: object) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
  }, [])

  const connect = useCallback(
    (action: { t: 'create' } | { t: 'join'; room: string }, name: string, useLang: Language) => {
      close()
      setError('')
      setStatus('connecting')
      setLang(useLang)
      const ws = new WebSocket(serverUrl())
      wsRef.current = ws
      ws.onopen = () => {
        if (action.t === 'create') ws.send(JSON.stringify({ t: 'create', name, lang: useLang }))
        else ws.send(JSON.stringify({ t: 'join', room: action.room, name }))
      }
      ws.onmessage = (ev: MessageEvent) => {
        let msg: Incoming
        try {
          msg = JSON.parse(String(ev.data)) as Incoming
        } catch {
          return
        }
        if (msg.t === 'error') {
          setError(typeof msg.message === 'string' ? msg.message : 'Server error.')
          setStatus((s) => (s === 'connecting' ? 'idle' : s))
          return
        }
        if (msg.t === 'joined') {
          setRoom(typeof msg.room === 'string' ? msg.room : '')
          setYouId(typeof msg.you === 'string' ? msg.you : '')
          if (msg.lang === 'ne' || msg.lang === 'en') setLang(msg.lang)
          setStatus('lobby')
          return
        }
        if (msg.t === 'room') {
          applyRoom(msg)
          return
        }
        if (msg.t === 'countdown') {
          const at = typeof msg.at === 'number' ? msg.at : Date.now() + 3000
          setWords(Array.isArray(msg.words) ? (msg.words as string[]) : [])
          setGoAt(at)
          setBoard([])
          setStatus('countdown')
          return
        }
        if (msg.t === 'positions') {
          const arr = (msg.positions as { id: string; p: number; wpm: number; finished: boolean }[] | undefined) ?? []
          setPlayers((prev) =>
            prev.map((p) => {
              const hit = arr.find((x) => x.id === p.id)
              return hit
                ? { ...p, progress: hit.p, wpm: hit.wpm, finished: hit.finished }
                : p
            }),
          )
          setStatus((s) => (s === 'countdown' ? 'racing' : s))
          return
        }
        if (msg.t === 'results') {
          setBoard((msg.board as BoardRow[] | undefined) ?? [])
          setStatus('done')
        }
      }
      ws.onclose = () => {
        setStatus((s) => (s === 'racing' || s === 'countdown' ? 'closed' : s))
      }
      ws.onerror = () => {
        setError('Could not reach the race server. Is it running?')
        setStatus('idle')
      }
    },
    [applyRoom, close],
  )

  const start = useCallback(() => send({ t: 'start' }), [send])

  const pushProgress = useCallback(
    (p: number, wpm: number) => {
      const now = Date.now()
      if (now - lastSent.current < 200) return
      lastSent.current = now
      send({ t: 'progress', p, wpm })
    },
    [send],
  )

  const pushFinish = useCallback(
    (wpm: number, acc: number) => send({ t: 'finish', wpm, acc }),
    [send],
  )

  const leave = useCallback(() => {
    send({ t: 'leave' })
    close()
    setStatus('idle')
    setRoom('')
    setPlayers([])
    setBoard([])
    setWords([])
    setGoAt(null)
  }, [send, close])

  const isHost = players.some((p) => p.id === youId && p.host)

  return {
    status,
    room,
    youId,
    lang,
    players,
    words,
    goAt,
    board,
    error,
    isHost,
    connect,
    start,
    pushProgress,
    pushFinish,
    leave,
  }
}
