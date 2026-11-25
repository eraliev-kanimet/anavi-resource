/**
 * Seeded, because a fixture that comes out different every run is a fixture nobody can point at:
 * «на Веге в третьем заказе» has to mean the same order tomorrow.
 */
export interface Random {
  int(min: number, max: number): number
  pick<T>(items: readonly T[]): T
  chance(probability: number): boolean
}

export function makeRandom(seed: number): Random {
  let state = seed >>> 0 || 1
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)]!,
    chance: (probability) => next() < probability,
  }
}

/** A number the whole run agrees on: the same slug always gets the same dice. */
export function seedOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}
