export type HandFanSlot = { angle: number; offsetY: number; overlap: number }

/** Visual-only fan geometry. It never changes hand order, legality or the game state. */
export function handFanLayout(count: number): HandFanSlot[] {
  if (!Number.isSafeInteger(count) || count < 1) return []
  const midpoint = (count - 1) / 2
  const maxAngle = Math.min(20, Math.max(5, (count - 1) * 1.35))
  const overlap = count > 5 ? -Math.min(38, 10 + (count - 6) * 2.5) : 0
  return Array.from({ length: count }, (_, index) => ({
    angle: midpoint === 0 || index === midpoint ? 0 : ((index - midpoint) / midpoint) * maxAngle,
    offsetY: Math.abs(index - midpoint) === 0 ? 0 : -Math.round(Math.abs(index - midpoint) * 0.75),
    overlap: index === 0 ? 0 : overlap,
  }))
}
