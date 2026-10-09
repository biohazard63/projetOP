import { normalizeCardColors as colors } from './cardColors'
import { z } from 'zod'

export const deckInput = z.object({
  name: z.string().trim().min(1).max(100),
  cards: z.array(z.object({ id: z.string().min(1), quantity: z.number().int().min(1).max(4).default(1) })).min(1).max(51),
})

type StoredCard = { id: string; code: string; type: string; color: string }


export function validateDeck(cards: z.infer<typeof deckInput>['cards'], stored: StoredCard[]): string | null {
  if (new Set(cards.map(c => c.id)).size !== cards.length) return 'Carte dupliquée dans la requête'
  const byId = new Map(stored.map(c => [c.id, c]))
  if (cards.some(c => !byId.has(c.id))) return 'Carte inconnue'
  const leaders = cards.filter(c => byId.get(c.id)?.type.toUpperCase() === 'LEADER')
  if (leaders.length !== 1 || leaders[0].quantity !== 1) return 'Le deck doit contenir exactement 1 leader'
  const main = cards.filter(c => c !== leaders[0])
  if (main.reduce((total, c) => total + c.quantity, 0) !== 50) return 'Le deck doit contenir exactement 50 cartes sans le leader'
  const allowed = colors(byId.get(leaders[0].id)!.color)
  const counts = new Map<string, number>()
  for (const entry of main) {
    const card = byId.get(entry.id)!
    if (!['CHARACTER', 'EVENT', 'STAGE'].includes(card.type.toUpperCase())) return 'Type de carte interdit'
    const cardColors = colors(card.color)
    if (!cardColors.length || cardColors.some(c => !allowed.includes(c))) return 'Couleur incompatible avec le leader'
    const code = card.code.replace(/_p\d+$/i, '')
    counts.set(code, (counts.get(code) || 0) + entry.quantity)
    if (counts.get(code)! > 4) return 'Maximum 4 exemplaires par numéro de carte'
  }
  return null
}
