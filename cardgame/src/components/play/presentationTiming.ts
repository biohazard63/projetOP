// Presentation only: these values never enter commands or the authoritative state.
export const ANIMATION_DURATIONS = Object.freeze({ draw: 450, play: 1200, 'don-attach': 450, 'don-rest': 400, 'don-add': 450,
  attack: 1200, block: 800, counter: 2500, power: 1200, life: 800, trigger: 2500, ko: 2500, trash: 650,
  ability: 1600, result: 1100, turn: 750, combat: 2500 })
export type AnimKind = keyof typeof ANIMATION_DURATIONS
export function presentationDuration(duration: number, fast: boolean): number {
  return fast ? Math.max(160, Math.round(duration * .4)) : duration
}
