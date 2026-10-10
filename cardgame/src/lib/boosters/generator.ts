import { BoosterError, normalizeRarity, type BoosterRules, type SlotChoice } from './rules'
export type DrawCard = { id: string; code?: string; setCode: string | null; rarity: string; isAltArt: boolean; isParallel: boolean; isSpecial: boolean }
export type CardWeights = ReadonlyMap<string, number>
// Same identity across alternate illustrations and compact/hyphenated catalogue codes.
export function drawIdentity(card: DrawCard): string {
  const value = (card.code?.trim() || card.id).toUpperCase()
  const number = value.match(/^((?:OP|EB|ST|PRB)-?\d+)-(\d+)(?=$|[_-])/)
  if (number) return `${number[1].replace('-', '')}-${number[2]}`
  return value.replace(/_P\d+$/i, '')
}
const insufficient = () => new BoosterError('INSUFFICIENT_UNIQUE_CARDS', 'Pas assez de numéros de cartes distincts pour cette composition. Aucun doublon ni remplacement de rareté n’est effectué.')
// Bipartite matching: reserve distinct numbers for all remaining slots, including
// overlapping rarity/variant pools. A greedy draw could otherwise get stuck.
function canComplete(pools: DrawCard[][], used: ReadonlySet<string>): boolean {
  const assigned = new Map<string, number>()
  const identities = pools.map(pool => [...new Set(pool.map(drawIdentity))].filter(id => !used.has(id)))
  function assign(slot: number, seen: Set<string>): boolean {
    for (const id of identities[slot]) {
      if (seen.has(id)) continue
      seen.add(id)
      const previous = assigned.get(id)
      if (previous === undefined || assign(previous, seen)) { assigned.set(id, slot); return true }
    }
    return false
  }
  return identities.every((_, index) => assign(index, new Set()))
}
export function metadataVariant(card: DrawCard): 'standard' | 'alt' | 'parallel' | 'special' {
  if (card.isSpecial || normalizeRarity(card.rarity) === 'SP CARD') return 'special'
  if (card.isAltArt) return 'alt'
  if (card.isParallel) return 'parallel'
  return 'standard'
}
export function matchesChoice(card: DrawCard, choice: SlotChoice, policy: BoosterRules['variantPolicy'] = 'legacy'): boolean {
  const rarityMatches = choice.rarity === '*' || normalizeRarity(card.rarity) === normalizeRarity(choice.rarity)
  if (policy === 'metadata') return rarityMatches && (choice.variant === 'any' || metadataVariant(card) === choice.variant)
  const alt = card.isAltArt || /_p\d+$/i.test(card.id)
  return rarityMatches &&
    (choice.variant === 'any' || (choice.variant === 'standard' && !alt && !card.isParallel && !card.isSpecial) || (choice.variant === 'alt' && alt) || (choice.variant === 'parallel' && card.isParallel) || (choice.variant === 'special' && card.isSpecial))
}
const slotPlans = (rules: BoosterRules) => rules.packProfiles?.map(p => p.slots) || [rules.slots, ...rules.specialPacks.map(p => p.slots)]
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
  for (const slots of slotPlans(rules)) {
    for (const item of slots) for (const choice of item.choices) {
      if (!cards.some(card => matchesChoice(card, choice, rules.variantPolicy) && (weights?.get(card.id) ?? 1) > 0)) missing.add(`${choice.rarity}/${choice.variant}`)
    }
  }
  if (missing.size) throw new BoosterError('INCOMPLETE_SET', `Extension incomplète : pool manquant pour ${[...missing].join(', ')}. Aucun remplacement de rareté n’est effectué.`)
  for (const slots of slotPlans(rules)) {
    const pools = slots.map(item => cards.filter(card => (weights?.get(card.id) ?? 1) > 0 && item.choices.some(choice => matchesChoice(card, choice, rules.variantPolicy))))
    if (!canComplete(pools, new Set())) throw insufficient()
  }
}
export function generateBooster<T extends DrawCard>(cards: T[], setCode: string, rules: BoosterRules, random: () => number, weights?: CardWeights): { cards: T[]; specialPack: string | null; profile?: string } {
  validatePools(cards, setCode, rules, weights)
  let slots = rules.slots
  let specialPack: string | null = null
  let profile: string | undefined
  if (rules.packProfiles) {
    const selected = rules.packProfiles[weightedIndex(rules.packProfiles.map(p => p.weight), random)]
    slots = selected.slots; profile = selected.label
    if (selected.special) specialPack = selected.label
  } else if (rules.specialPacks.length) {
    const probabilities = rules.specialPacks.map(pack => pack.probability)
    const index = weightedIndex([...probabilities, Math.max(0, 1 - probabilities.reduce((a, b) => a + b, 0))], random)
    if (index < rules.specialPacks.length) { slots = rules.specialPacks[index].slots; specialPack = rules.specialPacks[index].label }
  }
  // Select each rarity/variant once. Never retry a rarity or renormalize its
  // configured odds just because the selected composition cannot be filled.
  const pools = slots.map(item => {
    const choice = item.choices[weightedIndex(item.choices.map(c => c.weight), random)]
    return cards.filter(card => matchesChoice(card, choice, rules.variantPolicy) && (weights?.get(card.id) ?? 1) > 0)
  })
  const used = new Set<string>()
  if (!canComplete(pools, used)) throw insufficient()
  const result = pools.map((pool, index) => {
    let candidates = pool.filter(card => !used.has(drawIdentity(card)))
    while (candidates.length) {
      let card: T
      if (rules.selection === 'number') {
        const grouped = new Map<string, T[]>()
        for (const candidate of candidates) {
          const key = drawIdentity(candidate)
          grouped.set(key, [...(grouped.get(key) || []), candidate])
        }
        const groups = [...grouped.values()]
        // A new illustration must not multiply a number's weight. Explicit
        // per-card weights use the maximum weight for the number, then weight
        // the illustrations inside that number separately.
        const group = groups[weightedIndex(groups.map(g => Math.max(...g.map(c => weights?.get(c.id) ?? 1))), random)]
        card = group[weightedIndex(group.map(c => weights?.get(c.id) ?? 1), random)]
      } else card = candidates[weightedIndex(candidates.map(c => weights?.get(c.id) ?? 1), random)]
      const identity = drawIdentity(card)
      used.add(identity)
      if (canComplete(pools.slice(index + 1), used)) return card
      used.delete(identity)
      // Exclude a number that would make a later slot impossible, not just its art.
      candidates = candidates.filter(c => drawIdentity(c) !== identity)
    }
    throw insufficient()
  })
  return { cards: result, specialPack, ...(profile ? {profile} : {}) }
}
