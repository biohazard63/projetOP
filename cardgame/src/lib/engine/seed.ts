import { randomInt } from 'node:crypto'

// Server-only game seed. The engine PRNG (core/random.ts) is replayable and its state lives in GameState, so
// the protection is: an unpredictable CSPRNG seed, generated here, stored only with the authoritative state
// and never sent to a browser (projections carry no seed or PRNG value).
export const MAX_SEED = 0xffffffff
export function createSecureSeed(): number {
  return randomInt(1, MAX_SEED + 1)
}
