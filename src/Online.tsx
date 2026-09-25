import { useEffect, useMemo, useRef, useState } from 'react'
import RaceTrack from './RaceTrack.tsx'
import { Word } from './App.tsx'
import { useNetRoom, serverUrl } from './net.ts'
import { calcStats } from './race.ts'
import type { Language } from './race.ts'

const COLORS = [
  { bar: 'bg-yellow-400', dot: 'bg-yellow-400' },
  { bar: 'bg-sky-400', dot: 'bg-sky-400' },
  { bar: 'bg-rose-400', dot: 'bg-rose-400' },
  { bar: 'bg-emerald-400', dot: 'bg-emerald-400' },
  { bar: 'bg-violet-400', dot: 'bg-violet-400' },
  { bar: 'bg-orange-400', dot: 'bg-orange-400' },
]

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-yellow-400 text-zinc-950 shadow-[0_0_20px_-4px_rgba(250,204,21,0.6)]'
          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
      }`}
    >
      {children}
    </button>
  )
}

export default function Online({ onExit }: { onExit: () => void }) {
  const net = useNetRoom()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [lang, setLang] = useState<Language>('en')

  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState<string[]>([])
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [finishedLocal, setFinishedLocal] = useState(false)
  const [now, setNow] = useState(Date.now())
  const inputRef = useRef<HTMLInputElement>(null)

  const racing = startedAt !== null && !finishedLocal && net.status !== 'done'
  const words = net.words
  const totalChars = useMemo(() => words.join(' ').length, [words])
  const typedChars =
    submitted.join(' ').length + (racing ? input.length : 0)
  const progress = totalChars > 0 ? Math.min(1, typedChars / totalChars) : 0
  const elapsedSec = startedAt === null ? 0 : (now - startedAt) / 1000
  const wpm =
    elapsedSec > 1 && typedChars > 0
      ? Math.round(typedChars / 5 / (elapsedSec / 60))
      : 0

  // Fresh race whenever the server counts down.
  useEffect(() => {
    if (net.status !== 'countdown') return
    setIndex(0)
    setInput('')
    setSubmitted([])
    setStartedAt(null)
    setFinishedLocal(false)
  }, [net.status, net.goAt])

  // Clock + begin exactly at the server timestamp.
  useEffect(() => {
    if (net.status !== 'countdown' || net.goAt === null) return
    const id = window.setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= (net.goAt as number) && startedAt === null) {
        setStartedAt(net.goAt)
        window.setTimeout(() => inputRef.current?.focus(), 50)
      }
    }, 100)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [net.status, net.goAt])

  // Keep the clock running while racing/waiting.
  useEffect(() => {
    if (!startedAt || net.status === 'idle' || net.status === 'lobby') return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [startedAt, net.status])

  const type = (value: string) => {
    if (!racing) return
    if (value.endsWith(' ')) {
      if (value.trim() === '') {
        setInput('')
        return
      }
      const word = value.slice(0, -1)
      const next = [...submitted, word]
      setSubmitted(next)
      setIndex((i) => i + 1)
      setInput('')
      const p = totalChars > 0 ? Math.min(1, next.join(' ').length / totalChars) : 0
      net.pushProgress(p, wpm)
      if (next.length >= words.length) {
        const stats = calcStats(words, next, Math.max(elapsedSec, 0.01))
        net.pushFinish(stats.wpm, stats.acc)
        setFinishedLocal(true)
      }
      return
    }
    setInput(value)
    const p = totalChars > 0 ? Math.min(1, (submitted.join(' ').length + value.length) / totalChars) : 0
    net.pushProgress(p, wpm)
  }

  const create = () => {
    if (name.trim().length < 2) return
    net.connect({ t: 'create' }, name.trim(), lang)
  }
  const join = () => {
    if (name.trim().length < 2 || code.trim().length < 4) return
    net.connect({ t: 'join', room: code.trim() }, name.trim(), lang)
  }

  const lanes = net.players.map((p, i) => {
    const mine = p.id === net.youId
    const c = COLORS[i % COLORS.length]
    return {
      name: mine ? `${p.name} (YOU)` : p.name,
      value: mine ? progress : p.progress,
      bar: c.bar,
      dot: c.dot,
      dim: !mine,
    }
  })

  return (
    <div className="mt-8 flex flex-1 flex-col gap-6">
      {(net.status === 'idle' || net.status === 'connecting') && (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-center md:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-yellow-400">
            Online room
          </p>
          <h2 className="mt-3 text-2xl font-bold">Race the world</h2>
          <input
            value={name}
            maxLength={16}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            aria-label="Your name"
            className="mx-auto mt-5 block w-full max-w-xs rounded-full border border-white/10 bg-black/40 px-4 py-2.5 text-center text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-yellow-400/60 focus:outline-none"
          />
          <div className="mt-3 flex items-center justify-center gap-1 rounded-full border border-white/10 bg-black/40 p-1 self-center mx-auto w-fit">
            <Pill active={lang === 'en'} onClick={() => setLang('en')}>
              English
            </Pill>
            <Pill active={lang === 'ne'} onClick={() => setLang('ne')}>
              नेपाली
            </Pill>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={create}
              disabled={net.status === 'connecting'}
              className="rounded-full bg-yellow-400 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition-transform hover:scale-105 disabled:opacity-60"
            >
              Create room
            </button>
            <span className="font-mono text-xs text-zinc-600">or</span>
            <input
              value={code}
              maxLength={5}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CODE"
              aria-label="Room code"
              className="w-24 rounded-full border border-white/10 bg-black/40 px-4 py-2.5 text-center font-mono text-sm uppercase tracking-[0.2em] text-zinc-100 placeholder:text-zinc-600 focus:border-yellow-400/60 focus:outline-none"
            />
            <button
              onClick={join}
              disabled={net.status === 'connecting'}
              className="rounded-full border border-white/15 px-6 py-2.5 text-sm text-zinc-200 transition-colors hover:bg-white/5 disabled:opacity-60"
            >
              Join
            </button>
          </div>
          {net.error && (
            <p role="alert" className="mt-4 text-sm text-rose-400">
              {net.error}
            </p>
          )}
          <p className="mt-4 font-mono text-[11px] text-zinc-600">
            Server: {serverUrl()}
          </p>
          <button
            onClick={onExit}
            className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-600 transition-colors hover:text-zinc-300"
          >
            ← Back
          </button>
        </div>
      )}

      {net.status === 'lobby' && (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-center md:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-zinc-500">
            Room code · share it
          </p>
          <p className="mt-2 text-5xl font-bold tracking-[0.2em] text-yellow-400">
            {net.room}
          </p>
          <ul className="mx-auto mt-6 max-w-xs space-y-2">
            {net.players.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm"
              >
                <span className={p.id === net.youId ? 'text-zinc-100' : 'text-zinc-300'}>
                  {p.name}
                </span>
                {p.host && <span title="Host">👑</span>}
                {p.id === net.youId && (
                  <span className="ml-auto font-mono text-[10px] uppercase text-zinc-500">you</span>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {net.isHost ? (
              <button
                onClick={net.start}
                disabled={net.players.length < 2}
                className="rounded-full bg-yellow-400 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition-transform hover:scale-105 disabled:opacity-40"
              >
                Start race ({net.players.length})
              </button>
            ) : (
              <p className="font-mono text-xs text-zinc-500">
                Waiting for the host to start…
              </p>
            )}
            <button
              onClick={() => {
                net.leave()
              }}
              className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-600 transition-colors hover:text-zinc-300"
            >
              Leave
            </button>
          </div>
          {net.error && (
            <p role="alert" className="mt-4 text-sm text-rose-400">
              {net.error}
            </p>
          )}
        </div>
      )}

      {net.status === 'countdown' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-zinc-500">
            Room {net.room} · get ready
          </p>
          <p className="count-pop text-8xl font-bold tabular-nums text-yellow-400" key={Math.ceil(((net.goAt ?? Date.now()) - now) / 1000)}>
            {Math.max(0, Math.ceil(((net.goAt ?? Date.now()) - now) / 1000)) || 'GO!'}
          </p>
        </div>
      )}

      {(racing || finishedLocal) && net.status !== 'done' && (
        <div className="flex flex-1 flex-col gap-6">
          <RaceTrack lanes={lanes} wpm={wpm} label={`Room ${net.room}`} />
          <button
            type="button"
            onClick={() => inputRef.current?.focus()}
            className="block w-full cursor-text rounded-2xl border border-white/10 bg-black/40 p-6 text-left"
            aria-label="Focus the race input"
          >
            <p className={`text-xl leading-loose tracking-wide ${lang === 'ne' ? 'font-nepali' : ''}`}>
              {words.map((w, i) => (
                <Word
                  key={`${w}-${i}`}
                  target={w}
                  lang={lang}
                  typed={
                    i < index ? (submitted[i] ?? null) : i === index ? input : null
                  }
                  state={i < index ? 'done' : i === index ? 'active' : 'todo'}
                />
              ))}
            </p>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => type(e.target.value)}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Type the words above"
              className="sr-only"
            />
          </button>
          <p className="text-center font-mono text-xs text-zinc-500">
            {finishedLocal ? 'Finished — waiting for the room…' : `${elapsedSec.toFixed(1)}s · keep going`}
          </p>
        </div>
      )}

      {net.status === 'done' && (
        <div className="flex flex-1 flex-col gap-6">
          <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-6 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-yellow-400">
              Room {net.room} · results
            </p>
            <ol className="mx-auto mt-4 max-w-sm divide-y divide-white/10 text-left">
              {net.board.map((r, i) => (
                <li key={`${r.name}-${i}`} className="flex items-center gap-3 py-2.5">
                  <span className="font-mono text-sm tabular-nums text-zinc-500">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-semibold">{r.name}</span>
                  {!r.finished && (
                    <span className="font-mono text-[10px] uppercase text-zinc-600">dnf</span>
                  )}
                  <span className="ml-auto font-mono text-sm tabular-nums text-zinc-400">
                    {r.wpm} wpm · {r.acc}%
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {net.isHost && (
              <button
                onClick={net.start}
                className="rounded-full bg-yellow-400 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition-transform hover:scale-105"
              >
                Race again
              </button>
            )}
            <button
              onClick={() => {
                net.leave()
              }}
              className="rounded-full border border-white/15 px-6 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-white/5"
            >
              Lobby
            </button>
            <button
              onClick={() => {
                net.leave()
                onExit()
              }}
              className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-600 transition-colors hover:text-zinc-300"
            >
              Menu
            </button>
          </div>
        </div>
      )}

      {net.status === 'closed' && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-400/5 p-6 text-center">
          <p className="font-semibold">Connection lost.</p>
          <p className="mt-1 text-sm text-zinc-400">The room may still be waiting — rejoin with the code.</p>
          <button
            onClick={() => net.leave()}
            className="mt-4 rounded-full border border-white/15 px-6 py-2.5 text-sm text-zinc-200 transition-colors hover:bg-white/5"
          >
            Back to lobby
          </button>
        </div>
      )}
    </div>
  );
}
