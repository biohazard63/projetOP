import type { SetProgress } from './types'
type SummaryCard = { id: string; setCode?: string | null; isAltArt?: boolean | null; isParallel?: boolean | null; isSpecial?: boolean | null }
export function collectionStats(cards: SummaryCard[], owned: { cardId: string; quantity: number }[], sets: { code: string; name: string }[]) {
  const quantities = new Map(owned.filter(c => c.quantity > 0).map(c => [c.cardId, c.quantity]))
  const known = cards.filter(c => quantities.has(c.id))
  const alternative = (c: SummaryCard) => Boolean(c.isAltArt || c.isParallel || c.isSpecial)
  const percentage = (a: number, b: number) => b ? Math.round(a / b * 1000) / 10 : 0
  const progress: SetProgress[] = sets.map(set => {
    const pool = cards.filter(c => c.setCode === set.code)
    const collected = pool.filter(c => quantities.has(c.id))
    return { ...set, total: pool.length, unique: collected.length,
      copies: collected.reduce((n, c) => n + quantities.get(c.id)!, 0),
      percentage: percentage(collected.length, pool.length), alternatives: pool.filter(alternative).length,
      ownedAlternatives: collected.filter(alternative).length }
  })
  return { total: known.reduce((n, c) => n + quantities.get(c.id)!, 0), unique: known.length,
    catalogue: cards.length, percentage: percentage(known.length, cards.length),
    alternatives: cards.filter(alternative).length, ownedAlternatives: known.filter(alternative).length, sets: progress }
}
