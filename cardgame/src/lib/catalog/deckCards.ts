import type { Card } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { catalogById } from './cache'

// Deck queries read their DeckCard rows only (`cards: true`); each row then gets its card from the shared catalogue
// instead of a full card row per deck card from the database.
type DeckCardRow = { cardId: string; deckVersionId: string }
export type WithCards<T> = T extends Date ? T : T extends (infer U)[] ? WithCards<U>[] : T extends object
  ? { [K in keyof T]: WithCards<T[K]> } & (T extends DeckCardRow ? { card: Card } : unknown) : T

export async function withCatalogCards<T>(value: T): Promise<WithCards<T>> {
  const byId = await catalogById(prisma)
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk)
    if (!v || typeof v !== 'object' || v instanceof Date) return v
    const out: Record<string, unknown> = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]))
    if (typeof out.cardId === 'string' && typeof out.deckVersionId === 'string') {
      const card = byId.get(out.cardId)
      if (!card) throw new Error(`Carte inconnue du catalogue : ${out.cardId}`)
      out.card = card
    }
    return out
  }
  return walk(value) as WithCards<T>
}
