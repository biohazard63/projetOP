import { z } from 'zod'
import raw from './economy.json'

// Berry economy settings, read from economy.json (amounts and timed events, editable without touching the code).
// Game settings of the simulator, not real money: Berries cannot be bought.
const amount = z.number().int().nonnegative()
const multiplier = z.number().positive().max(10)
const eventSchema = z.object({
  id: z.string().min(1), label: z.string().min(1), start: z.string().datetime({ offset: true }), end: z.string().datetime({ offset: true }),
  rewardMultiplier: multiplier.optional(), priceMultiplier: multiplier.optional(), resaleMultiplier: multiplier.optional(),
}).passthrough()
const schema = z.object({
  version: z.string().min(1), starterGrant: amount,
  prices: z.object({ booster: amount, display: amount }),
  rewards: z.object({ dailyTreasure: amount, botGame: z.object({ easy: amount, normal: amount, hard: amount }), winMultiplier: multiplier, minTurns: z.number().int().min(0), dailyGameCap: amount }),
  resale: z.object({ keepCopies: z.number().int().min(0), values: z.record(z.string(), amount) }),
  events: z.array(eventSchema),
}).passthrough()
export const ECONOMY = schema.parse(raw)
export type EconomyEvent = z.infer<typeof eventSchema>

export const activeEvents = (at: Date = new Date()) => ECONOMY.events.filter(e => new Date(e.start) <= at && at < new Date(e.end))
const factor = (key: 'rewardMultiplier' | 'priceMultiplier' | 'resaleMultiplier', at: Date) => activeEvents(at).reduce((f, e) => f * (e[key] ?? 1), 1)

/** Settings in force at a date, events applied (rounded to whole Berries). */
export function economyAt(at: Date = new Date()) {
  const reward = factor('rewardMultiplier', at), price = factor('priceMultiplier', at), resale = factor('resaleMultiplier', at)
  const r = (value: number, f: number) => Math.round(value * f)
  return {
    version: ECONOMY.version, events: activeEvents(at).map(e => ({ id: e.id, label: e.label, end: e.end })),
    starterGrant: ECONOMY.starterGrant,
    prices: { booster: r(ECONOMY.prices.booster, price), display: r(ECONOMY.prices.display, price) },
    rewards: {
      dailyTreasure: r(ECONOMY.rewards.dailyTreasure, reward),
      botGame: { easy: r(ECONOMY.rewards.botGame.easy, reward), normal: r(ECONOMY.rewards.botGame.normal, reward), hard: r(ECONOMY.rewards.botGame.hard, reward) },
      winMultiplier: ECONOMY.rewards.winMultiplier, minTurns: ECONOMY.rewards.minTurns, dailyGameCap: r(ECONOMY.rewards.dailyGameCap, reward),
    },
    resale: { keepCopies: ECONOMY.resale.keepCopies, values: Object.fromEntries(Object.entries(ECONOMY.resale.values).map(([tier, v]) => [tier, r(v, resale)])) as Record<string, number> },
  }
}
export type Economy = ReturnType<typeof economyAt>

/** Paris calendar day (YYYY-MM-DD): the daily treasure and the daily game cap reset at midnight in Paris. */
export function parisDay(at: Date = new Date()) {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(at)
}
/** Start of the current Paris day as an instant (for "today" queries). */
export function parisDayStart(at: Date = new Date()) {
  const day = parisDay(at)
  for (const offset of ['+01:00', '+02:00']) { const start = new Date(`${day}T00:00:00${offset}`); if (parisDay(start) === day && parisDay(new Date(start.getTime() - 1)) !== day) return start }
  return new Date(`${day}T00:00:00+01:00`)
}
