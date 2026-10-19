import type { OpeningCard } from './types'
export type RevealState = { index: number; faceUp: boolean; complete: boolean }
export function advanceReveal(state: RevealState, count: number): RevealState {
  if (count <= 0 || state.complete) return { ...state, complete: true }
  if (!state.faceUp) return { ...state, faceUp: true }
  if (state.index + 1 >= count) return { ...state, complete: true }
  return { index: state.index + 1, faceUp: false, complete: false }
}
/** Light of a legendary reveal: silver, gold or red. */
export const LEGENDARY: Record<string, 'silver' | 'gold' | 'red'> = { 'SP SILVER': 'silver', 'SP GOLD': 'gold', 'MANGA GOLD': 'gold', 'MANGA RED': 'red' }
export function openingEffect(card: Pick<OpeningCard, 'rarity' | 'drawVariant' | 'isAltArt' | 'isParallel' | 'isSpecial'> & { drawTier?: string }) {
  // A tiered draw knows the product's tier (a PRB frame is a standard card there, a reprinted SEC can be an SP).
  // Reveal levels: alternatives shine, SP / Wanted / TR flash, manga families open on comic panels, the rarest are legendary.
  if (card.drawTier === 'ALT' || card.drawTier === 'LEADER ALT') return 'holographic'
  if (card.drawTier && ['SP CARD', 'WANTED', 'TR'].includes(card.drawTier)) return 'secret'
  if (card.drawTier && ['MANGA', 'CREW ALT', 'SUPER LEADER'].includes(card.drawTier)) return 'manga'
  if (card.drawTier && card.drawTier in LEGENDARY) return 'legendary'
  if (card.drawTier) return openingEffect({ rarity: card.drawTier, drawVariant: 'standard', isAltArt: false, isParallel: false, isSpecial: false })
  const variant = card.drawVariant || (card.isSpecial ? 'special' : card.isAltArt ? 'alt' : card.isParallel ? 'parallel' : 'standard')
  if (variant === 'alt' || variant === 'parallel') return 'holographic'
  if (variant === 'special') return 'secret'
  const rarity = card.rarity.trim().toUpperCase().replace(/[_-]/g, ' ')
  if (['SEC', 'SECRET RARE', 'TR', 'SP', 'SP CARD', 'SR SP', 'SP SR', 'R SP'].includes(rarity)) return 'secret'
  if (['SR', 'SUPER RARE'].includes(rarity)) return 'super'
  if (['R', 'RARE'].includes(rarity)) return 'rare'
  if (['UC', 'UNCOMMON'].includes(rarity)) return 'uncommon'
  return 'common'
}
export function animationDuration(speed: 'slow' | 'normal' | 'fast', quick: boolean) {
  return quick ? 450 : speed === 'slow' ? 4400 : speed === 'fast' ? 1800 : 3400
}
