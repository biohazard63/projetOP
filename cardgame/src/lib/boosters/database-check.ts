import type { PrismaClient } from '@prisma/client'

export const receiptMigration = '20261009120000_secure_booster_openings'
const requiredColumns = ['idempotencyKey', 'creditedAt', 'resultSnapshot', 'rulesSnapshot']

/** Inspect metadata only; even accidental writes in this transaction are refused. */
export async function inspectBoosterDatabase(db: PrismaClient) {
  return db.$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`
    const columns = await tx.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'BoosterOpening'`
    const indexes = await tx.$queryRaw<{ tablename: string; indexdef: string }[]>`
      SELECT tablename, indexdef FROM pg_indexes
      WHERE schemaname = current_schema() AND tablename IN ('BoosterOpening', 'BoosterOpeningCard')`
    const hasUnique = (table: string, fields: string) => indexes.some(row =>
      row.tablename === table && row.indexdef.includes('CREATE UNIQUE INDEX') && row.indexdef.includes(fields))
    const history = await tx.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables
        WHERE table_schema = current_schema() AND table_name = '_prisma_migrations') AS exists`
    const applied = history[0]?.exists ? await tx.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name FROM "_prisma_migrations"
      WHERE migration_name = ${receiptMigration} AND finished_at IS NOT NULL AND rolled_back_at IS NULL` : []
    const missingColumns = requiredColumns.filter(name => !columns.some(row => row.column_name === name))
    const idempotencyIndex = hasUnique('BoosterOpening', '("userId", "idempotencyKey")')
    const positionsIndex = hasUnique('BoosterOpeningCard', '("boosterOpeningId", "position")')
    return { status: missingColumns.length || !idempotencyIndex || !positionsIndex ? 'FAIL' : 'PASS',
      missingColumns, idempotencyIndex, positionsIndex, migrationRecorded: applied.length === 1, migration: receiptMigration }
  })
}
