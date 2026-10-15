import manifest from './booster-tiers.json'
import { normalizeSetCode, rulesSchema, type BoosterRules } from './rules'

// Realistic 12-card packs: standard cards first, alternates only in the last two positions (11 = rare slot,
// 12 = hit slot). A tier is drawn first, then a number inside it (selection "number"), so the count of
// illustrations never raises a tier's odds. Game rates of the simulator, set from community box observations
// (≈ 2 alternates and 5–8 SR per 24-pack display, SP ≈ 1 per case, manga rarer); red manga 1 in 1 440 is a game choice; Bandai publishes no rates.
export const TIER_RATES_VERSION = 'tiers-2026-10-15b'
export const DRAW_TIERS = ['C', 'UC', 'R', 'L', 'SR', 'SEC', 'ALT', 'SP CARD', 'TR', 'MANGA', 'MANGA RED'] as const
export type DrawTier = typeof DRAW_TIERS[number]
const RARE_SLOT: [DrawTier, number][] = [['L', 1 / 3], ['ALT', 1 / 36]]
const HIT_SLOT: [DrawTier, number][] = [['SR', 7 / 24], ['SEC', 1 / 36], ['ALT', 1 / 18], ['SP CARD', 1 / 96], ['TR', 1 / 288], ['MANGA', 1 / 288], ['MANGA RED', 1 / 1440]]
// Base positions 1 → 10 by product family (EB has no UC; PRB adds rares and a standard SR).
const BASE: Record<'OP' | 'EB' | 'PRB', [DrawTier, number][]> = {
  OP: [['C', 7], ['UC', 3]],
  EB: [['C', 8], ['R', 2]],
  PRB: [['C', 4], ['UC', 2], ['R', 3], ['SR', 1]],
}
const sets = manifest.sets as Record<string, Partial<Record<DrawTier, string[]>>>

export function tierPools(setCode: string): Partial<Record<DrawTier, string[]>> | null {
  return sets[setCode] ?? Object.entries(sets).find(([code]) => normalizeSetCode(code) === normalizeSetCode(setCode))?.[1] ?? null
}
const family = (code: string) => /^PRB/i.test(code) ? 'PRB' : /^EB/i.test(code) ? 'EB' : 'OP'

/** Rules of the tiered pack for a product. An absent tier gives its share to the standard rare of that slot. */
export function tieredRules(setCode: string, available: ReadonlySet<DrawTier>): BoosterRules {
  const choices = (odds: [DrawTier, number][]) => {
    const present = odds.filter(([tier]) => available.has(tier))
    const rest = 1 - present.reduce((sum, [, weight]) => sum + weight, 0)
    return [{ rarity: 'R', weight: rest, variant: 'any' as const }, ...present.map(([rarity, weight]) => ({ rarity, weight, variant: 'any' as const }))]
  }
  const slots = [
    ...BASE[family(setCode)].flatMap(([rarity, count]) => Array.from({ length: count }, () => ({ choices: [{ rarity, weight: 1, variant: 'any' as const }] }))),
    { label: 'Carte rare', choices: choices(RARE_SLOT) },
    { label: 'Coup de chance', choices: choices(HIT_SLOT) },
  ]
  return rulesSchema.parse({ version: 1, label: 'Booster réaliste · 12 cartes', source: 'Taux du simulateur Mugiwara inspirés d’observations de joueurs (displays de 24) ; Bandai ne publie aucun taux', selection: 'number', slots, specialPacks: [] })
}
