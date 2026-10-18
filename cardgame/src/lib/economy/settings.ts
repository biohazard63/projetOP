import type { Prisma, PrismaClient } from '@prisma/client'
import { ECONOMY, economyAt, economySchema } from './config'

/** Read inside the caller's transaction: screens and actual payments use the same active settings. */
export async function readEconomySettings(db: PrismaClient | Prisma.TransactionClient) {
  const defaults = { value: ECONOMY, revision: 0, updatedAt: null as Date | null }
  if (!db.adminSetting) return defaults
  // Check without raising a missing-table error, which would abort a PostgreSQL transaction.
  const [table] = await db.$queryRaw<{ present: boolean }[]>`SELECT to_regclass('"AdminSetting"') IS NOT NULL AS present`
  if (!table?.present) return defaults
  const row = await db.adminSetting.findUnique({ where: { id: 'economy' } })
  return row ? { value: economySchema.parse(row.value), revision: row.revision, updatedAt: row.updatedAt } : defaults
}
export async function currentEconomy(db: PrismaClient | Prisma.TransactionClient, at = new Date()) {
  return economyAt(at, (await readEconomySettings(db)).value)
}
