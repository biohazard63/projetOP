type VisualCard = { rarity: string; rarityName?: string | null; isAltArt?: boolean | null; isParallel?: boolean | null; isSpecial?: boolean | null }
export type CardEffect = 'common' | 'rare' | 'super' | 'secret' | 'holographic'
// Presentation only. This map never determines draw probabilities.
export const rarityEffects: Record<string, CardEffect> = {
  R: 'rare', RARE: 'rare', SR: 'super', 'SUPER RARE': 'super',
  SEC: 'secret', 'SECRET RARE': 'secret', SP: 'secret', 'SP CARD': 'secret', TR: 'secret',
}
export function cardEffect(card: VisualCard, configuration = rarityEffects): CardEffect {
  if (card.isAltArt || card.isParallel || card.isSpecial) return 'holographic'
  return configuration[(card.rarityName || '').toUpperCase()] || configuration[card.rarity.toUpperCase()] || 'common'
}
