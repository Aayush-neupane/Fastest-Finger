import { useEffect, useRef, useState } from 'react'
import RaceTrack from './RaceTrack.tsx'
import PartyMatch from './Party.tsx'
import Online from './Online.tsx'
import { useRace } from './useRace.ts'
import { loadBest, type Language } from './race.ts'
import { PORTFOLIO_URL } from './site.ts'

export function Word({
  target,
  typed,
  state,
  lang,
}: {
  target: string
  typed: string | null
  state: 'done' | 'active' | 'todo'
  lang: Language
}) {
  if (lang === 'ne') {
    let cls = 'text-zinc-600'
    if (state === 'done') cls = typed === target ? 'text-zinc-100' : 'text-rose-400 line-through decoration-rose-500/40'
    else if (state === 'active') cls = 'rounded bg-yellow-400/10 px-1 text-yellow-100'
    return (
      <span className="mr-[0.6ch] inline-block whitespace-pre font-nepali">
        <span className={cls}>{target}</span>
      </span>
    )
  }
  const shown = typed ?? ''
  const len = Math.max(target.length, shown.length)
  const letters = []
  for (let i = 0; i < len; i++) {
    const expected = target[i]
    const got = shown[i]
    let cls = 'text-zinc-600'
    if (state === 'done') cls = typed === target ? 'text-zinc-100' : 'text-rose-400'
    else if (got !== undefined) cls = got === expected ? 'text-zinc-100' : 'text-rose-400'
    letters.push(
      <span key={i} className={cls}>
        {expected ?? got}
      </span>,
    )
  }
  return <span className="mr-[0.6ch] inline-block whitespace-pre">{letters}</span>
}

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

const COUNTDOWN = ['3', '2', '1', 'GO!']

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('ff-lang')
    return saved === 'en' || saved === 'ne' ? saved : 'en'
  })
  const [ghostOn, setGhostOn] = useState(true)
  const [best, setBest] = useState(() => loadBest(lang))
  const [mode, setMode] = useState<'solo' | 'party'>('solo')
  const [partyNames, setPartyNames] = useState(['Player 1', 'Player 2'])
  const [partyOn, setPartyOn] = useState(false)
  const [onlineOn, setOnlineOn] = useState(false)
  const [count, setCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const race = useRace(lang, ghostOn)

  useEffect(() => {
    localStorage.setItem('ff-lang', lang)
    setBest(loadBest(lang))
  }, [lang])

  // Countdown ticks, then the race starts and the input takes focus.
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

  useEffect(() => {
    if (race.phase === 'finished') setBest(loadBest(lang))
  }, [race.phase, lang])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (race.phase === 'menu' || race.phase === 'finished')) {
        race.startCountdown()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [race])

  return (
    <main className="app-backdrop min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-8">
        <header className="flex flex-wrap items-center gap-4">
          <img
            src="/logo.png"
            alt="Fastest Fingers logo"
            className="h-11 w-11 rounded-xl border border-white/10 object-cover"
          />
          <div className="mr-auto leading-none">
            <p className="text-xl font-bold tracking-[0.2em]">FASTEST</p>
            <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.35em] text-zinc-500">
              Fingers
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/40 p-1">
            <Pill active={lang === 'en'} onClick={() => setLang('en')}>
              English
            </Pill>
            <Pill active={lang === 'ne'} onClick={() => setLang('ne')}>
              नेपाली
            </Pill>
          </div>
        </header>

        {race.phase === 'menu' && !partyOn && !onlineOn && (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-yellow-400">
              Type race · 24 words
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
              Beat the ghost.
              <br />
              <span className="text-zinc-500">Keep the crown.</span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400">
              Race 24 words against your own best pace — or pass the keyboard
              and settle it with friends.
            </p>
            <div className="mt-6 flex items-center gap-1 rounded-full border border-white/10 bg-black/40 p-1">
              <Pill active={mode === 'solo'} onClick={() => setMode('solo')}>
                Solo
              </Pill>
              <Pill active={mode === 'party'} onClick={() => setMode('party')}>
                Party
              </Pill>
            </div>
            <button
              onClick={() => setOnlineOn(true)}
              className="mt-3 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-sky-300 transition-colors hover:text-sky-200"
            >
              <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Play online — live rooms
            </button>

            {mode === 'solo' ? (
              <>
                <label className="mt-6 flex cursor-pointer items-center gap-2.5 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={ghostOn}
                    onChange={(e) => setGhostOn(e.target.checked)}
                    className="h-4 w-4 accent-yellow-400"
                  />
                  Race against my best ghost
                  {best && (
                    <span className="font-mono text-xs text-zinc-500">({best.wpm} wpm)</span>
                  )}
                </label>
                <button
                  onClick={race.startCountdown}
                  className="mt-8 rounded-full bg-yellow-400 px-8 py-3 font-semibold text-zinc-950 shadow-[0_0_30px_-6px_rgba(250,204,21,0.7)] transition-transform hover:scale-105"
                >
                  Start race
                </button>
                {best && (
                  <p className="mt-4 font-mono text-xs text-zinc-500">
                    Personal best · {best.wpm} wpm · {best.acc}% acc
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="mt-6 w-full max-w-xs space-y-2.5">
                  {partyNames.map((n, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="font-mono text-xs tabular-nums text-zinc-500">
                        P{i + 1}
                      </span>
                      <input
                        value={n}
                        maxLength={16}
                        onChange={(e) =>
                          setPartyNames((prev) => {
                            const next = [...prev]
                            next[i] = e.target.value
                            return next
                          })
                        }
                        placeholder={`Player ${i + 1}`}
                        aria-label={`Player ${i + 1} name`}
                        className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-yellow-400/60 focus:outline-none"
                      />
                      {partyNames.length > 2 && (
                        <button
                          onClick={() =>
                            setPartyNames((prev) => prev.filter((_, j) => j !== i))
                          }
                          aria-label={`Remove player ${i + 1}`}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 text-zinc-500 transition-colors hover:border-rose-400/60 hover:text-rose-300"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  {partyNames.length < 4 && (
                    <button
                      onClick={() =>
                        setPartyNames((prev) => [...prev, `Player ${prev.length + 1}`])
                      }
                      className="rounded-full border border-white/15 px-5 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5"
                    >
                      + Add player
                    </button>
                  )}
                  <button
                    onClick={() => setPartyOn(true)}
                    className="rounded-full bg-yellow-400 px-6 py-2 font-semibold text-zinc-950 shadow-[0_0_30px_-6px_rgba(250,204,21,0.7)] transition-transform hover:scale-105"
                  >
                    Start match
                  </button>
                </div>
                <p className="mt-4 font-mono text-xs text-zinc-500">
                  Same 24 words each · highest WPM takes the crown
                </p>
              </>
            )}
          </div>
        )}

        {partyOn && (
          <PartyMatch
            names={partyNames.map((n, i) => n.trim() || `Player ${i + 1}`)}
            lang={lang}
            onExit={() => setPartyOn(false)}
          />
        )}

        {onlineOn && <Online onExit={() => setOnlineOn(false)} />}

        {race.phase === 'countdown' && (
          <div className="flex flex-1 items-center justify-center">
            <p key={count} className="count-pop text-8xl font-bold text-yellow-400">
              {COUNTDOWN[Math.min(count, COUNTDOWN.length - 1)]}
            </p>
          </div>
        )}

        {(race.phase === 'racing' || race.phase === 'finished') && (
          <div className="mt-8 flex flex-1 flex-col gap-6">
            <RaceTrack
              lanes={[
                { name: 'YOU', value: race.progress, bar: 'bg-yellow-400', dot: 'bg-yellow-400' },
                ...(race.ghostProgress !== null
                  ? [{ name: 'GHOST', value: race.ghostProgress, bar: 'bg-sky-400', dot: 'bg-sky-400', dim: true }]
                  : []),
              ]}
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
        )}

        {race.phase === 'finished' && (
          <div className="mt-8 rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-6 text-center">
            {race.isBest && (
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-yellow-400">
                New personal best
              </p>
            )}
            <p className="mt-2 text-5xl font-bold tabular-nums">{race.stats.wpm}</p>
            <p className="mt-1 font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">
              wpm · {race.stats.acc}% accuracy
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                onClick={race.startCountdown}
                className="rounded-full bg-yellow-400 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition-transform hover:scale-105"
              >
                Race again
              </button>
              <button
                onClick={race.backToMenu}
                className="rounded-full border border-white/15 px-6 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-white/5"
              >
                Menu
              </button>
            </div>
          </div>
        )}

        <footer className="mt-8 flex flex-col items-center gap-3 border-t border-white/10 pt-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-600">
            Fastest Fingers · v1
          </span>
          <a
            href={PORTFOLIO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Aayush Neupane — portfolio"
            className="inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500 transition-colors hover:text-zinc-100"
          >
            <img
              src="/logotrp.png"
              alt="Aayush Neupane"
              width={28}
              height={28}
              draggable={false}
              className="h-7 w-7 rounded-full border border-white/20 object-cover"
            />
            <span>
              Developed by <span className="text-zinc-100 underline-offset-4 hover:underline">Aayush Neupane</span>
            </span>
          </a>
        </footer>
      </div>
    </main>
  );
}
