import { randomWords, type Language } from './words'

export type { Language }

export const RACE_WORDS = 24

export interface Best {
  wpm: number
  acc: number
}

export interface RaceStats {
  wpm: number
  acc: number
  correctWords: number
  totalWords: number
  correctChars: number
  typedChars: number
  elapsedSec: number
}

export function buildRace(lang: Language): string[] {
  return randomWords(lang, RACE_WORDS)
}

export function calcStats(
  targets: string[],
  submitted: string[],
  elapsedSec: number,
): RaceStats {
  let correctWords = 0
  let correctChars = 0
  let typedChars = 0
  submitted.forEach((typed, i) => {
    const target = targets[i] ?? ''
    typedChars += typed.length
    if (typed === target) {
      correctWords++
      correctChars += target.length
    } else {
      for (let c = 0; c < Math.min(typed.length, target.length); c++) {
        if (typed[c] === target[c]) correctChars++
      }
    }
  })
  const minutes = Math.max(elapsedSec / 60, 1 / 3600)
  return {
    wpm: Math.round(correctChars / 5 / minutes),
    acc: typedChars > 0 ? Math.round((correctChars / typedChars) * 100) : 100,
    correctWords,
    totalWords: targets.length,
    correctChars,
    typedChars,
    elapsedSec,
  }
}

function key(lang: Language): string {
  return `ff-best-${lang}`
}

export function loadBest(lang: Language): Best | null {
  try {
    const raw = localStorage.getItem(key(lang))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Best
    if (typeof parsed.wpm !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

export function saveBest(lang: Language, stats: RaceStats): boolean {
  const prev = loadBest(lang)
  if (prev && stats.wpm <= prev.wpm) return false
  try {
    localStorage.setItem(key(lang), JSON.stringify({ wpm: stats.wpm, acc: stats.acc }))
  } catch {
    /* private mode */
  }
  return true
}

/** Ghost pace in chars/sec derived from the saved best. */
export function ghostCps(lang: Language): number | null {
  const best = loadBest(lang)
  if (!best || best.wpm <= 0) return null
  return (best.wpm * 5) / 60
}
