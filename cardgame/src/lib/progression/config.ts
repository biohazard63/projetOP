import { z } from 'zod'
import raw from './progression.json'

// Account levels and tiered badges, read from progression.json (thresholds, rewards and titles editable there).
const n = z.number().int().nonnegative()
const schema = z.object({
  version: z.string(),
  ranks: z.array(z.object({ id: z.string(), label: z.string(), levels: z.number().int().positive(), reward: n, xp: n, title: z.boolean().optional() })).min(1),
  secretReward: z.object({ berries: n, xp: n }),
  xp: z.object({ booster: n, newCard: n, game: z.object({ easy: n, normal: n, hard: n }), winMultiplier: z.number().positive(), dailyTreasure: n }),
  levels: z.object({ max: z.number().int().min(2), curve: z.object({ base: z.number().positive(), exponent: z.number().positive() }), rewardEach: n, rewardEvery5: n, rewardEvery10: n }),
  titles: z.array(z.object({ from: z.number().int().min(1), title: z.string() })).min(1),
  badges: z.array(z.object({ id: z.string(), name: z.string(), category: z.enum(['openings', 'collection', 'battles', 'loyalty']), metric: z.string(), unit: z.string(), legendTitle: z.string(), thresholds: z.array(z.number().positive()) })),
  secrets: z.array(z.object({ id: z.string(), name: z.string(), hint: z.string() })),
}).passthrough().superRefine((c, ctx) => {
  const steps = c.ranks.reduce((sum, r) => sum + r.levels, 0)
  for (const b of c.badges) {
    if (b.thresholds.length !== steps) ctx.addIssue({ code: 'custom', message: `${b.id}: ${steps} paliers attendus` })
    if (b.thresholds.some((t, i) => i && t <= b.thresholds[i - 1])) ctx.addIssue({ code: 'custom', message: `${b.id}: paliers croissants attendus` })
  }
})
export const PROGRESSION = schema.parse(raw)
export type BadgeDefinition = (typeof PROGRESSION.badges)[number]
export const BADGE_STEPS = PROGRESSION.ranks.reduce((sum, r) => sum + r.levels, 0)

const ROMAN = ['I', 'II', 'III', 'IV', 'V']
/** Rank of a badge level (1-based): e.g. level 5 → Argent II. */
export function rankOf(level: number) {
  let left = level
  for (const rank of PROGRESSION.ranks) {
    if (left <= rank.levels) return { ...rank, sub: rank.levels > 1 ? ROMAN[left - 1] : '', label: rank.levels > 1 ? `${rank.label} ${ROMAN[left - 1]}` : rank.label }
    left -= rank.levels
  }
  const last = PROGRESSION.ranks.at(-1)!
  return { ...last, sub: '', label: last.label }
}
/** Badge level reached for a metric value (0 = none yet). */
export const badgeLevel = (badge: BadgeDefinition, value: number) => badge.thresholds.filter(t => value >= t).length

/** Total XP needed to reach an account level (level 1 = 0 XP). */
export const xpForLevel = (level: number) => level <= 1 ? 0 : Math.round(PROGRESSION.levels.curve.base * (level - 1) ** PROGRESSION.levels.curve.exponent)
export function levelOf(xp: number) {
  let level = 1
  while (level < PROGRESSION.levels.max && xp >= xpForLevel(level + 1)) level++
  const from = xpForLevel(level), to = level < PROGRESSION.levels.max ? xpForLevel(level + 1) : from
  return { level, xp, from, to, progress: to > from ? (xp - from) / (to - from) : 1 }
}
export const titleOf = (level: number) => [...PROGRESSION.titles].reverse().find(t => level >= t.from)!.title
/** Berries for reaching an account level (each level, more every 5 and every 10). */
export function levelReward(level: number) {
  const l = PROGRESSION.levels
  return level % 10 === 0 ? l.rewardEvery10 : level % 5 === 0 ? l.rewardEvery5 : l.rewardEach
}
