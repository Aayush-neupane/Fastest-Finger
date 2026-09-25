import { useEffect, useRef, useState } from 'react'
import RaceTrack from './RaceTrack.tsx'
import { Word } from './App.tsx'
import { useRace } from './useRace.ts'
import { buildRace, type Language, type RaceStats } from './race.ts'

const COUNTDOWN = ['3', '2', '1', 'GO!']

function PartyTurn({
  words,
  lang,
  playerName,
  turnLabel,
  onDone,
}: {
  words: string[]
  lang: Language
  playerName: string
  turnLabel: string
  onDone: (stats: RaceStats) => void
}) {
  const [count, setCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const race = useRace(lang, false, words)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    race.startCountdown()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (race.phase !== 'countdown') return
    setCount(0)
    const id = window.setInterval(() => {
      setCount((c) => {
        if (c + 1 >= COUNTDOWN.length) {
          window.clearInterval(id)
          race.beginRacing()
          window.setTimeout(() => inputRef.current?.focus(), 50)
        }
        return c + 1
      })
    }, 700)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [race.phase])

  const reported = useRef(false)
  useEffect(() => {
    if (race.phase === 'finished' && !reported.current) {
      reported.current = true
      const t = window.setTimeout(() => doneRef.current(race.stats), 1400)
      return () => window.clearTimeout(t)
    }
  }, [race.phase, race.stats])

  if (race.phase === 'menu') {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="font-mono text-sm uppercase tracking-[0.3em] text-zinc-500">
          {turnLabel} · {playerName} — get ready
        </p>
      </div>
    )
  }

  if (race.phase === 'countdown') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-zinc-500">
          {playerName}’s turn
        </p>
        <p key={count} className="count-pop text-8xl font-bold text-yellow-400">
          {COUNTDOWN[Math.min(count, COUNTDOWN.length - 1)]}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-8 flex flex-1 flex-col gap-6">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-zinc-500">
        {playerName}’s turn · pass the keyboard when done
      </p>
      <RaceTrack
        lanes={[{ name: 'YOU', value: race.progress, bar: 'bg-yellow-400', dot: 'bg-yellow-400' }]}
        wpm={race.stats.wpm}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.focus()}
        className="block w-full cursor-text rounded-2xl border border-white/10 bg-black/40 p-6 text-left"
        aria-label="Focus the race input"
      >
        <p className={`text-xl leading-loose tracking-wide ${lang === 'ne' ? 'font-nepali' : ''}`}>
          {race.words.map((w, i) => (
            <Word
              key={`${w}-${i}`}
              target={w}
              lang={lang}
              typed={
                i < race.index
                  ? (race.submitted[i] ?? null)
                  : i === race.index
                    ? race.input
                    : null
              }
              state={
                race.phase === 'finished' || i < race.index
                  ? 'done'
                  : i === race.index
                    ? 'active'
                    : 'todo'
              }
            />
          ))}
        </p>
        <input
          ref={inputRef}
          value={race.input}
          onChange={(e) => race.type(e.target.value)}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Type the words above"
          className="sr-only"
        />
      </button>
      <div className="flex items-center gap-6 font-mono text-xs tabular-nums text-zinc-400">
        <span>
          <span className="text-xl font-bold text-zinc-100">{race.stats.acc}</span>% acc
        </span>
        <span>
          <span className="text-xl font-bold text-zinc-100">
            {race.stats.correctWords}/{race.words.length}
          </span>{' '}
          words
        </span>
        <span className="ml-auto">{race.elapsedSec.toFixed(1)}s</span>
      </div>
    </div>
  )
}

export default function PartyMatch({
  names,
  lang,
  onExit,
}: {
  names: string[]
  lang: Language
  onExit: () => void
}) {
  const [words, setWords] = useState<string[]>(() => buildRace(lang))
  const [turn, setTurn] = useState(0)
  const [results, setResults] = useState<(RaceStats | null)[]>(() => names.map(() => null))
  const done = turn >= names.length

  const sorted = names
    .map((name, i) => ({ name, stats: results[i] }))
    .filter((r): r is { name: string; stats: RaceStats } => r.stats !== null)
    .sort((a, b) => b.stats.wpm - a.stats.wpm || b.stats.acc - a.stats.acc)

  const rematch = () => {
    setWords(buildRace(lang))
    setTurn(0)
    setResults(names.map(() => null))
  }

  if (done) {
    const winner = sorted[0]
    return (
      <div className="mt-8 flex flex-1 flex-col gap-6">
        <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-6 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-yellow-400">
            Winner
          </p>
          <p className="mt-2 text-4xl font-bold">{winner?.name}</p>
          <p className="mt-1 font-mono text-xs tabular-nums text-zinc-400">
            {winner?.stats.wpm} wpm · {winner?.stats.acc}% acc
          </p>
        </div>
        <ol className="divide-y divide-white/10 rounded-2xl border border-white/10">
          {sorted.map((r, i) => (
            <li key={r.name} className="flex items-center gap-4 px-5 py-3.5">
              <span className="font-mono text-sm tabular-nums text-zinc-500">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="font-semibold">{r.name}</span>
              <span className="ml-auto font-mono text-sm tabular-nums text-zinc-400">
                {r.stats.wpm} wpm · {r.stats.acc}%
              </span>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={rematch}
            className="rounded-full bg-yellow-400 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition-transform hover:scale-105"
          >
            Rematch
          </button>
          <button
            onClick={onExit}
            className="rounded-full border border-white/15 px-6 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-white/5"
          >
            Menu
          </button>
        </div>
      </div>
    )
  }

  return (
    <PartyTurn
      key={`${turn}-${words.join('').length}`}
      words={words}
      lang={lang}
      playerName={names[turn]}
      turnLabel={`Turn ${turn + 1} of ${names.length}`}
      onDone={(stats) => {
        setResults((prev) => {
          const next = [...prev]
          next[turn] = stats
          return next
        })
        setTurn((t) => t + 1)
      }}
    />
  )
}
