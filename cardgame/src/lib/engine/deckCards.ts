import type { Card } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { playableCardIds } from './catalog'

/**
 * A deck saved from the deck builder holds only cards its owner has collected (enough copies) and that the game engine can play
 * (playableCardIds: the same checks as a game start), so that it can be taken to /play. Returns the refusal, or null.
 */
export async function deckCardsRefusal(userId: string, cards: { id: string; quantity: number }[], stored: Card[]): Promise<string | null> {
  const owned = new Map((await prisma.userCard.findMany({ where: { userId, cardId: { in: cards.map(c => c.id) } }, select: { cardId: true, quantity: true } })).map(r => [r.cardId, r.quantity]))
  const short = cards.filter(c => (owned.get(c.id) ?? 0) < c.quantity)
  if (short.length) return 'Ce deck contient plus d’exemplaires que votre collection.'
  const playable = playableCardIds(stored), byId = new Map(stored.map(c => [c.id, c]))
  const refused = cards.filter(c => !playable.has(c.id)).map(c => byId.get(c.id)?.name ?? c.id)
  return refused.length ? `Retirez les cartes non jouables en partie : ${refused.join(', ')}.` : null
}
