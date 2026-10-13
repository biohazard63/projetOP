export type CharacterPosition<T> = { kind: 'card'; card: T } | { kind: 'empty'; index: number }

/** Returns visual positions for a Character Area without manufacturing card instances. */
export function characterPositions<T>(characters: readonly T[], capacity = 5): CharacterPosition<T>[] {
  const positions: CharacterPosition<T>[] = characters.map(card => ({ kind: 'card', card }))
  for (let index = characters.length; index < capacity; index += 1) positions.push({ kind: 'empty', index })
  return positions
}
