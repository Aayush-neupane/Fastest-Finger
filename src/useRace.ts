import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildRace, calcStats, ghostCps, saveBest, type Language, type RaceStats } from './race'

export type Phase = 'menu' | 'countdown' | 'racing' | 'finished'

export function useRace(lang: Language, ghostOn: boolean, fixedWords: string[] | null = null) {
  const [phase, setPhase] = useState<Phase>('menu')
  const [words, setWords] = useState<string[]>(() => fixedWords ?? buildRace(lang))
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState<string[]>([])
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const [isBest, setIsBest] = useState(false)
  const timerRef = useRef<number | null>(null)
  const elapsedRef = useRef(0)

  const ghost = useMemo(() => (ghostOn ? ghostCps(lang) : null), [ghostOn, lang, phase])

  const stopTick = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => stopTick, [stopTick])

  // Live clock while racing (drives WPM + ghost).
  useEffect(() => {
    if (phase !== 'racing') return
    timerRef.current = window.setInterval(() => setNow(Date.now()), 100)
    return stopTick
  }, [phase, stopTick])

  const elapsedSec = startedAt === null ? 0 : ((finishedAt ?? now) - startedAt) / 1000
  useEffect(() => {
    elapsedRef.current = elapsedSec
  }, [elapsedSec])

  const stats: RaceStats = useMemo(
    () => calcStats(words, submitted, Math.max(elapsedSec, 0.01)),
    [words, submitted, elapsedSec],
  )

  const totalChars = useMemo(
    () => words.join(' ').length,
    [words],
  )
  const typedChars = useMemo(
    () => submitted.join(' ').length + (phase === 'racing' ? input.length : 0),
    [submitted, input, phase],
  )
  const progress = totalChars > 0 ? Math.min(1, typedChars / totalChars) : 0
  const ghostProgress =
    ghost !== null && startedAt !== null
      ? Math.min(1, (elapsedSec * ghost) / Math.max(totalChars, 1))
      : null

  const startCountdown = useCallback(() => {
    setWords(fixedWords ?? buildRace(lang))
    setIndex(0)
    setInput('')
    setSubmitted([])
    setStartedAt(null)
    setFinishedAt(null)
    setIsBest(false)
    setPhase('countdown')
  }, [lang, fixedWords])

  const beginRacing = useCallback(() => {
    setStartedAt(Date.now())
    setPhase('racing')
  }, [])

  const finish = useCallback(
    (finalSubmitted: string[]) => {
      const doneAt = Date.now()
      setFinishedAt(doneAt)
      const final = calcStats(words, finalSubmitted, Math.max(elapsedRef.current, 0.01))
      setIsBest(saveBest(lang, final))
      stopTick()
      setPhase('finished')
    },
    [words, lang, stopTick],
  );

  const type = useCallback(
    (value: string) => {
      if (phase !== 'racing') return
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
        if (next.length >= words.length) finish(next)
        return
      }
      setInput(value)
      // Final word typed exactly (no trailing space): finish immediately.
      if (index === words.length - 1 && value === words[index]) {
        const next = [...submitted, value]
        setSubmitted(next)
        setIndex((i) => i + 1)
        setInput('')
        finish(next)
      }
    },
    [phase, submitted, words, index, lang, stopTick, finish],
  )

  return {
    phase,
    words,
    index,
    input,
    submitted,
    stats,
    elapsedSec,
    progress,
    ghostProgress,
    isBest,
    startCountdown,
    beginRacing,
    type,
    backToMenu: () => {
      stopTick()
      setPhase('menu')
    },
  }
}
