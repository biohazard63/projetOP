import { createHash } from 'node:crypto'
import type { Prisma } from '@prisma/client'

export const userSelect = { id: true, name: true, email: true, emailVerified: true, createdAt: true, updatedAt: true, berries: true, accountLevel: true, progressSyncedAt: true } satisfies Prisma.UserSelect
export const cardSelect = { id: true, code: true, name: true, imageUrl: true, type: true, color: true, rarity: true, setCode: true, cost: true, power: true, counter: true, effect: true, ability: true, trigger: true, attribute: true, family: true, notes: true, isAltArt: true, isParallel: true, isSpecial: true } satisfies Prisma.CardSelect
export const gameSelect = { id: true, userId: true, status: true, deckRef: true, botDeckRef: true, botLevel: true, rulesetId: true, engineVersion: true, version: true, createdAt: true, finishedAt: true, user: { select: { name: true, email: true } } } satisfies Prisma.EngineGameSelect
export function fingerprint(value: unknown): string {
  const sort = (v: unknown): unknown => v instanceof Date ? v.toISOString() : Array.isArray(v) ? v.map(sort) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sort(x)])) : v
  return createHash('sha256').update(JSON.stringify(sort(value))).digest('hex')
}
export const asJson = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
