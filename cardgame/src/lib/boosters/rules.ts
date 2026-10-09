import { z } from 'zod'

const choiceSchema = z.object({
  rarity: z.string().trim().min(1).max(30),
  weight: z.number().finite().positive(),
  variant: z.enum(['any', 'standard', 'alt', 'parallel', 'special']).default('any'),
}).strict()
const slotSchema = z.object({ label: z.string().max(100).optional(), choices: z.array(choiceSchema).min(1).max(20) }).strict()
export const rulesSchema = z.object({
  version: z.literal(1),
  label: z.string().min(1).max(200),
  source: z.string().min(1).max(300),
  slots: z.array(slotSchema).min(1).max(30),
  specialPacks: z.array(z.object({ label: z.string().min(1).max(100), probability: z.number().finite().positive().max(1), slots: z.array(slotSchema).min(1).max(30) }).strict()).max(10).default([]),
}).strict().superRefine((rules, ctx) => {
  if (rules.specialPacks.reduce((sum, pack) => sum + pack.probability, 0) > 1) ctx.addIssue({ code: 'custom', message: 'La somme des probabilités spéciales dépasse 1' })
  if (rules.specialPacks.some(pack => pack.slots.length !== rules.slots.length)) ctx.addIssue({ code: 'custom', message: 'Les packs spéciaux doivent conserver le nombre de slots' })
})
export type BoosterRules = z.infer<typeof rulesSchema>
export type SlotChoice = BoosterRules['slots'][number]['choices'][number]
export class BoosterError extends Error {
  constructor(public code: string, message: string, public status = 422) { super(message) }
}
export const normalizeSetCode = (code: string) => code.trim().toUpperCase().replace(/[\s-]/g, '')
export const normalizeRarity = (rarity: string) => {
  const value = rarity.trim().toUpperCase().replace(/\s+/g, ' ')
  return value === 'U' ? 'UC' : ['SP', 'SPCARD', 'SR SP'].includes(value) ? 'SP CARD' : value
}
const slot = (weights: Record<string, number>) => ({ choices: Object.entries(weights).map(([rarity, weight]) => ({ rarity, weight, variant: 'any' as const })) })
// These are existing simulator weights from the active API, never official rates.
export const legacyDefaultRules: BoosterRules = {
  version: 1, label: 'Simulation historique · 12 cartes', source: 'Ancien /api/booster/open ; taux du simulateur, non officiels',
  slots: [slot({ C: 1 }), slot({ C: 1 }), slot({ C: 1 }), slot({ C: 1 }), slot({ C: 1 }), slot({ UC: .8, R: .2 }), slot({ UC: .6, R: .3, SR: .1 }), slot({ UC: .4, R: .4, SR: .2 }), slot({ R: .6, SR: .3, L: .1 }), slot({ R: .5, SR: .3, L: .15, SEC: .05 }), slot({ R: .3, SR: .3, L: .2, SEC: .1, 'SP CARD': .05, TR: .05 }), slot({ R: .25, SR: .25, L: .2, SEC: .15, 'SP CARD': .1, TR: .05 })],
  specialPacks: [{ label: 'God Pack (simulation)', probability: .01, slots: Array.from({ length: 12 }, () => slot({ SR: .5, L: .2, SEC: .15, 'SP CARD': .1, TR: .05 })) }],
}
const countsSchema = z.object({ commonCount: z.number().int().min(0).max(30), uncommonCount: z.number().int().min(0).max(30), rareCount: z.number().int().min(0).max(30), superRareCount: z.number().int().min(0).max(30), leaderCount: z.number().int().min(0).max(30).default(0) })

export function resolveRules(value: unknown): { rules: BoosterRules; warnings: string[] } {
  if (value == null) return { rules: legacyDefaultRules, warnings: ['Aucune règle propre à cette extension : ancien profil de simulation explicite.'] }
  if (typeof value === 'object' && value !== null && ('version' in value || 'slots' in value)) {
    const parsed = rulesSchema.safeParse(value)
    if (!parsed.success) throw new BoosterError('INVALID_RULES', 'La configuration des slots est invalide')
    return { rules: parsed.data, warnings: [] }
  }
  const parsed = countsSchema.safeParse(value)
  if (!parsed.success) throw new BoosterError('INVALID_RULES', 'Les règles historiques de cette extension sont invalides')
  const counts = parsed.data
  const slots = ([['C', counts.commonCount], ['UC', counts.uncommonCount], ['R', counts.rareCount], ['SR', counts.superRareCount], ['L', counts.leaderCount]] as const).flatMap(([rarity, count]) => Array.from({ length: count }, () => slot({ [rarity]: 1 })))
  if (!slots.length || slots.length > 30) throw new BoosterError('INVALID_RULES', 'Nombre de cartes par booster invalide')
  return {
    rules: { version: 1, label: 'Répartition configurée pour cette extension', source: 'SetRules.boosterRules historique ; configuration de simulateur, non officielle', slots, specialPacks: [] },
    warnings: ['Les anciens champs altArtChance/parallelChance/specialChance, typeCounts et donCount ne définissent pas des slots exploitables. Ils ne sont pas appliqués ; les variantes présentes restent éligibles selon leur rareté. Configurer le format v1 pour des probabilités de variantes explicites.'],
  }
}
