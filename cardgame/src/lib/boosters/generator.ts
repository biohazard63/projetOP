import { BoosterError, normalizeRarity, type BoosterRules, type SlotChoice } from './rules'
export type DrawCard = { id: string; setCode: string | null; rarity: string; isAltArt: boolean; isParallel: boolean; isSpecial: boolean }
export type CardWeights = ReadonlyMap<string, number>
export function matchesChoice(card: DrawCard, choice: SlotChoice): boolean {
  const alt = card.isAltArt || /_p\d+$/i.test(card.id)
  return (choice.rarity === '*' || normalizeRarity(card.rarity) === normalizeRarity(choice.rarity)) &&
    (choice.variant === 'any' || (choice.variant === 'standard' && !alt && !card.isParallel && !card.isSpecial) || (choice.variant === 'alt' && alt) || (choice.variant === 'parallel' && card.isParallel) || (choice.variant === 'special' && card.isSpecial))
}
export function weightedIndex(weights: number[], random: () => number): number {
  const total = weights.reduce((a, b) => a + b, 0)
  if (!weights.length || !Number.isFinite(total) || total <= 0 || weights.some(w => !Number.isFinite(w) || w < 0)) throw new BoosterError('INVALID_WEIGHTS', 'Poids de tirage invalides')
  const value = random()
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new BoosterError('INVALID_RANDOM', 'Source aléatoire invalide', 500)
  let cursor = value * total
  for (let i = 0; i < weights.length; i++) { cursor -= weights[i]; if (cursor < 0) return i }
  // Floating-point rounding must never select a trailing zero-weight item.
  return weights.findLastIndex(weight => weight > 0)
}
export function validatePools<T extends DrawCard>(cards: T[], setCode: string, rules: BoosterRules, weights?: CardWeights): void {
  if (!cards.length) throw new BoosterError('EMPTY_SET', 'Cette extension ne contient aucune carte éligible')
  if (cards.some(card => card.setCode !== setCode)) throw new BoosterError('FOREIGN_CARD', 'Le pool contient une carte d’une autre extension')
  if (weights && cards.some(card => !weights.has(card.id) || !Number.isFinite(weights.get(card.id)) || weights.get(card.id)! < 0)) throw new BoosterError('INVALID_WEIGHTS', 'Les poids BoosterCard sont invalides')
  const missing = new Set<string>()
  for (const slots of [rules.slots, ...rules.specialPacks.map(pack => pack.slots)]) {
    for (const item of slots) for (const choice of item.choices) {
      if (!cards.some(card => matchesChoice(card, choice) && (weights?.get(card.id) ?? 1) > 0)) missing.add(`${choice.rarity}/${choice.variant}`)
    }
  }
  if (missing.size) throw new BoosterError('INCOMPLETE_SET', `Extension incomplète : pool manquant pour ${[...missing].join(', ')}. Aucun remplacement de rareté n’est effectué.`)
}
export function generateBooster<T extends DrawCard>(cards: T[], setCode: string, rules: BoosterRules, random: () => number, weights?: CardWeights): { cards: T[]; specialPack: string | null } {
  validatePools(cards, setCode, rules, weights)
  let slots = rules.slots
  let specialPack: string | null = null
  if (rules.specialPacks.length) {
    const probabilities = rules.specialPacks.map(pack => pack.probability)
    const index = weightedIndex([...probabilities, Math.max(0, 1 - probabilities.reduce((a, b) => a + b, 0))], random)
    if (index < rules.specialPacks.length) { slots = rules.specialPacks[index].slots; specialPack = rules.specialPacks[index].label }
  }
  return {
    cards: slots.map(item => {
      const choice = item.choices[weightedIndex(item.choices.map(c => c.weight), random)]
      const pool = cards.filter(card => matchesChoice(card, choice))
      return pool[weightedIndex(pool.map(card => weights?.get(card.id) ?? 1), random)]
    }), specialPack,
  }
}
