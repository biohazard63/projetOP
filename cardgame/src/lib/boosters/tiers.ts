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

/** Rules of the tiered pack for a product. An absent tier gives its share to the standard rare of that slot.
 *  With `forced`, the rare and hit slots are the tiers planned for this pack of a virtual display. */
export function tieredRules(setCode: string, available: ReadonlySet<DrawTier>, forced?: PackPlan): BoosterRules {
  const choices = (odds: [DrawTier, number][]) => {
    const present = odds.filter(([tier]) => available.has(tier))
    const rest = 1 - present.reduce((sum, [, weight]) => sum + weight, 0)
    return [{ rarity: 'R', weight: rest, variant: 'any' as const }, ...present.map(([rarity, weight]) => ({ rarity, weight, variant: 'any' as const }))]
  }
  const slots = [
    ...BASE[family(setCode)].flatMap(([rarity, count]) => Array.from({ length: count }, () => ({ choices: [{ rarity, weight: 1, variant: 'any' as const }] }))),
    { label: 'Carte rare', choices: forced ? [{ rarity: forced.rare, weight: 1, variant: 'any' as const }] : choices(RARE_SLOT) },
    { label: 'Coup de chance', choices: forced ? [{ rarity: forced.hit, weight: 1, variant: 'any' as const }] : choices(HIT_SLOT) },
  ]
  return rulesSchema.parse({ version: 1, label: 'Booster réaliste · 12 cartes', source: 'Taux du simulateur Mugiwara inspirés d’observations de joueurs (displays de 24) ; Bandai ne publie aucun taux', selection: 'number', slots, specialPacks: [] })
}

// Virtual display: a box of DISPLAY_SIZE packs whose rare and hit slots are planned when it is created. Each tier gets
// its expected count for the box (rate × packs), a fractional part being drawn (stochastic rounding), so the long-run
// rates stay the per-pack rates above while a box always holds e.g. exactly 2 alternates, 7 SR and 8 Leaders.
export const DISPLAY_SIZE = 24
export type PackPlan = { rare: DrawTier; hit: DrawTier }
export function planDisplay(available: ReadonlySet<DrawTier>, random: () => number, size = DISPLAY_SIZE): PackPlan[] {
  const round = (expected: number) => Math.floor(expected + 1e-9) + (random() < expected - Math.floor(expected + 1e-9) ? 1 : 0)
  const counts = (odds: [DrawTier, number][]) => odds.filter(([tier]) => tier !== 'ALT' && available.has(tier)).flatMap(([tier, rate]) => Array<DrawTier>(round(rate * size)).fill(tier))
  // Alternates are counted for the whole box (both slots together), then each one is put in the rare or the hit slot.
  const altRate = (odds: [DrawTier, number][]) => odds.find(([tier]) => tier === 'ALT')?.[1] ?? 0
  const alts = available.has('ALT') ? round((altRate(RARE_SLOT) + altRate(HIT_SLOT)) * size) : 0
  const inRare = Array.from({ length: alts }, () => random() < altRate(RARE_SLOT) / (altRate(RARE_SLOT) + altRate(HIT_SLOT))).filter(Boolean).length
  const shuffle = <T,>(items: T[]) => { for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]] } return items }
  const slot = (tiers: DrawTier[]) => shuffle([...tiers, ...Array<DrawTier>(size).fill('R')].slice(0, size))
  const rare = slot([...counts(RARE_SLOT), ...Array<DrawTier>(inRare).fill('ALT')]), hit = slot([...counts(HIT_SLOT), ...Array<DrawTier>(alts - inRare).fill('ALT')])
  return rare.map((r, i) => ({ rare: r, hit: hit[i] }))
}
