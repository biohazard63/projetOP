// Presentation only: these values never enter commands or the authoritative state.
export const ANIMATION_DURATIONS = Object.freeze({ draw: 450, play: 1200, 'don-attach': 450, 'don-rest': 400, 'don-add': 450,
  attack: 1200, block: 800, counter: 2500, power: 1200, life: 800, trigger: 2500, ko: 2500, trash: 650,
  ability: 1600, result: 1100, turn: 1500, combat: 2500 })
export type AnimKind = keyof typeof ANIMATION_DURATIONS
export function presentationDuration(duration: number, fast: boolean): number {
  return fast ? Math.max(160, Math.round(duration * .4)) : duration
}

// Popups that carry card text are timed for reading, not for motion: about 2 s plus 60 ms per character (4 s to 12 s).
// 'manual' waits for "Continuer"; 'fast' halves the reading time for players who already know the cards.
export type ReadingMode = 'auto' | 'manual' | 'fast'
export const READING_MODES: ReadingMode[] = ['auto', 'manual', 'fast']
export function readingDuration(text: string): number {
  return Math.min(12000, Math.max(4000, 2000 + 60 * text.length))
}
/** null: no timer, the popup waits for the player. */
export function readingTimeout(duration: number, mode: ReadingMode): number | null {
  return mode === 'manual' ? null : mode === 'fast' ? Math.max(2000, Math.round(duration / 2)) : duration
}
