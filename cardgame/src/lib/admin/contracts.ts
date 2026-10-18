import { z } from 'zod'
import { economySchema } from '../economy/config'
import { rulesSchema } from '../boosters/rules'

const id = z.string().min(1).max(300)
const text = z.string().trim().min(1).max(300)
const nullableText = z.string().max(12000).nullable()
const image = z.string().max(2000).refine(v => !v || (v.startsWith('/') && !v.startsWith('//')) || /^https?:\/\//i.test(v)).nullable()
export const cardChanges = z.object({ name: text.optional(), imageUrl: image.optional(), type: z.enum(['LEADER', 'CHARACTER', 'EVENT', 'STAGE', 'DON']).optional(), color: text.optional(), rarity: text.optional(), cost: z.number().int().min(0).max(100).nullable().optional(), power: z.number().int().min(0).max(100000).nullable().optional(), counter: z.string().max(30).nullable().optional(), effect: nullableText.optional(), ability: nullableText.optional(), trigger: nullableText.optional(), attribute: text.nullable().optional(), family: text.nullable().optional(), notes: nullableText.optional(), isAltArt: z.boolean().optional(), isParallel: z.boolean().optional(), isSpecial: z.boolean().optional() }).strict().refine(v => Object.keys(v).length > 0)
const base = { requestId: id, expected: z.string().min(1).max(100), reason: z.string().trim().min(5).max(1000) }
export const adminEconomySchema = economySchema.superRefine((s, ctx) => {
  if (new Set(s.events.map(e => e.id)).size !== s.events.length) ctx.addIssue({ code: 'custom', message: 'Les identifiants des événements doivent être uniques.' })
  for (const event of s.events) if (new Date(event.end) <= new Date(event.start)) ctx.addIssue({ code: 'custom', message: 'La fin d’un événement doit suivre son début.' })
  const amounts = [s.starterGrant, ...Object.values(s.prices), s.rewards.dailyTreasure, ...Object.values(s.rewards.botGame), s.rewards.dailyGameCap, ...Object.values(s.resale.values)]
  if (amounts.some(n => n > 100000000)) ctx.addIssue({ code: 'custom', message: 'Montant maximal : 100 000 000 Berrys.' })
  const product = (key: 'priceMultiplier' | 'rewardMultiplier' | 'resaleMultiplier') => s.events.reduce((v, e) => v * Math.max(1, e[key] ?? 1), 1)
  if (Math.max(...amounts, 1) * product('priceMultiplier') * product('rewardMultiplier') * product('resaleMultiplier') * Math.max(24, s.rewards.winMultiplier) > 2147483647) ctx.addIssue({ code: 'custom', message: 'Ces multiplicateurs peuvent dépasser la limite de solde.' })
})
export const adminAction = z.discriminatedUnion('type', [
  z.object({ ...base, type: z.literal('USER_BERRIES'), id, amount: z.number().int().min(-100000000).max(100000000).refine(n => n !== 0) }).strict(),
  z.object({ ...base, type: z.literal('USER_COLLECTION'), id, cardId: id, quantity: z.number().int().min(0).max(100000) }).strict(),
  z.object({ ...base, type: z.literal('CARD_EDIT'), id, changes: cardChanges }).strict(),
  z.object({ ...base, type: z.literal('SET_EDIT'), id, changes: z.object({ name: text, description: nullableText, imageUrl: image }).strict() }).strict(),
  z.object({ ...base, type: z.literal('RULES_EDIT'), id, rules: rulesSchema }).strict(),
  z.object({ ...base, type: z.literal('ECONOMY_EDIT'), id: z.literal('economy'), settings: adminEconomySchema }).strict(),
])
export type AdminAction = z.infer<typeof adminAction>
export const resources = ['overview', 'users', 'cards', 'sets', 'economy', 'openings', 'games', 'audit'] as const
export type AdminResource = typeof resources[number]
export const adminQuery = z.object({ q: z.string().trim().max(120).default(''), page: z.coerce.number().int().min(1).max(100000).default(1), card: id.optional(), set: z.string().max(100).optional(), rarity: z.string().max(30).optional(), type: z.string().max(30).optional(), variant: z.enum(['standard', 'alt', 'parallel', 'special']).optional(), user: id.optional(), status: z.enum(['ACTIVE', 'FINISHED']).optional(), level: z.enum(['easy', 'normal', 'hard']).optional(), from: z.string().date().optional(), to: z.string().date().optional() })
export type AdminQuery = z.infer<typeof adminQuery>
export function adjustedBalance(before: number, amount: number) {
  const after = before + amount
  if (after < 0) throw Error('INSUFFICIENT_BERRIES')
  if (!Number.isSafeInteger(after) || after > 2147483647) throw Error('BALANCE_LIMIT')
  return after
}
