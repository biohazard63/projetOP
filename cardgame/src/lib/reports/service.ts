import { z } from 'zod'

export const REPORT_CATEGORIES = { WRONG_VARIANT: 'Alternative ou variante mal indiquée', WRONG_IMAGE: 'Mauvaise image', WRONG_DATA: 'Texte ou caractéristiques incorrects', WRONG_EFFECT: 'Effet de jeu incorrect', BUG: 'Autre bug' } as const
export const REPORT_STATUSES = { NEW: 'Nouveau', IN_PROGRESS: 'En cours', FIXED: 'Corrigé', UNCONFIRMED: 'Non confirmé' } as const
export const reportStatus = z.enum(['NEW', 'IN_PROGRESS', 'FIXED', 'UNCONFIRMED'])
export const reportFilters = z.object({ status: reportStatus.optional(), source: z.enum(['PLAY', 'BOOSTER']).optional(), category: z.enum(['WRONG_VARIANT', 'WRONG_IMAGE', 'WRONG_DATA', 'WRONG_EFFECT', 'BUG']).optional(), q: z.string().trim().max(120).optional(), cursor: z.string().min(1).max(100).optional() })
export type ReportFilters = z.infer<typeof reportFilters>
const short = z.string().max(300)
const number = z.number().int().min(-1000000).max(1000000).nullable().optional()
const image = z.string().max(2000).refine(s => (s.startsWith('/') && !s.startsWith('//')) || /^https?:\/\//i.test(s), 'Image invalide').nullable().optional()
// Deliberate whitelist: never persist an engine state, seed, request URL/query or auth token.
export const cardSnapshot = z.object({
  id: short.optional(), printingKey: short.optional(), definitionId: short.optional(), code: short.min(1), name: short.min(1),
  imageUrl: image, set: short.nullable().optional(), setCode: short.nullable().optional(), rarity: short.nullable().optional(), rarityName: short.nullable().optional(), type: short.optional(), color: short.optional(), colors: z.array(short).max(6).optional(),
  cost: number, power: number, counter: z.union([z.number(), short]).nullable().optional(), life: number, attribute: short.nullable().optional(), family: short.nullable().optional(),
  effect: z.string().max(12000).nullable().optional(), ability: z.string().max(12000).nullable().optional(), trigger: z.string().max(12000).nullable().optional(),
  originalText: z.string().max(12000).optional(), originalTrigger: z.string().max(12000).optional(), language: short.optional(), notes: z.string().max(12000).nullable().optional(),
  displayedEffect: z.string().max(12000).nullable().optional(), displayedTrigger: z.string().max(12000).nullable().optional(), textSource: short.nullable().optional(), originalShown: z.boolean().optional(), currentPower: number, rested: z.boolean().optional(),
  isAltArt: z.boolean().optional(), isParallel: z.boolean().optional(), isSpecial: z.boolean().optional(), drawVariant: short.optional(), drawTier: short.optional(), position: number,
})
export type ReportCard = z.infer<typeof cardSnapshot>
const contextSchema = z.object({
  pathname: z.enum(['/play', '/booster-opening', '/boosters']).optional(), gameId: short.min(1).optional(), openingId: short.min(1).optional(),
  turn: z.number().int().nonnegative().optional(), version: z.number().int().nonnegative().optional(), phase: short.optional(),
  events: z.array(z.object({ type: short, sequence: z.number().int().nonnegative() })).max(20).optional(),
})
export type ReportContext = z.infer<typeof contextSchema>
export const reportRequest = z.object({
  requestId: z.string().min(1).max(100), source: z.enum(['PLAY', 'BOOSTER']), category: z.enum(['WRONG_VARIANT', 'WRONG_IMAGE', 'WRONG_DATA', 'WRONG_EFFECT', 'BUG']),
  description: z.string().trim().min(5).max(4000), card: cardSnapshot.optional(), context: contextSchema,
}).superRefine((data, ctx) => {
  if (data.category !== 'BUG' && !data.card) ctx.addIssue({ code: 'custom', path: ['card'], message: 'Carte requise' })
  if ((data.source === 'BOOSTER' && data.context.gameId) || (data.source === 'PLAY' && (data.context.openingId || !data.context.gameId))) ctx.addIssue({ code: 'custom', path: ['context'], message: 'Contexte invalide' })
})
export type ReportInput = z.infer<typeof reportRequest>
export type SavedReportInput = ReportInput & { userId: string }
export interface ReportStore {
  ownsGame(userId: string, id: string): Promise<boolean>
  ownsOpening(userId: string, id: string): Promise<boolean>
  save(data: SavedReportInput): Promise<{ id: string }>
}
export function isReportAdmin(email: string | null | undefined, allowed = process.env.REPORT_ADMIN_EMAILS ?? '') {
  return Boolean(email && allowed.split(',').map(v => v.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase()))
}
export async function createReport(userId: string | null | undefined, body: unknown, store: ReportStore) {
  if (!userId) throw new Error('AUTH_REQUIRED')
  const parsed = reportRequest.safeParse(body)
  if (!parsed.success) throw new Error('INVALID_REPORT')
  const data = parsed.data
  if (data.context.gameId && !await store.ownsGame(userId, data.context.gameId)) throw new Error('CONTEXT_NOT_FOUND')
  if (data.context.openingId && !await store.ownsOpening(userId, data.context.openingId)) throw new Error('CONTEXT_NOT_FOUND')
  return store.save({ ...data, userId })
}
