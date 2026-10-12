// A replayable test PRNG, not a source of secret seeds for a production server.
export type RandomState = { algorithm: string; value: number; draws: number }
export type RandomGenerator = { id: string; next(value: number): { value: number; sample: number } }
export const seededRandom: RandomGenerator = {
  id: 'xorshift32-v1',
  next(value) {
    let next = value | 0
    next ^= next << 13; next ^= next >>> 17; next ^= next << 5
    return { value: next >>> 0, sample: (next >>> 0) / 4294967296 }
  },
}
export function sample(state: RandomState, generator: RandomGenerator): number {
  if (generator.id !== state.algorithm) throw new Error('RNG_ALGORITHM_MISMATCH')
  const next = generator.next(state.value)
  if (!Number.isSafeInteger(next.value) || next.value < 0 || next.value > 0xffffffff || !Number.isFinite(next.sample) || next.sample < 0 || next.sample >= 1) throw new Error('INVALID_RNG_OUTPUT')
  state.value = next.value; state.draws++
  return next.sample
}
export function shuffle<T>(cards: T[], state: RandomState, generator: RandomGenerator): T[] {
  const result = [...cards]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(sample(state, generator) * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
