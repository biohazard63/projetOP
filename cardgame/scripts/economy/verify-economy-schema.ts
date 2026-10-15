import { PrismaClient } from '@prisma/client'

// Read-only check of the Berry economy schema on any database (Neon included): migration history, tables, columns,
// the non-negative balance constraint and the one-open-box index. It never writes.
// Usage: DATABASE_URL="<direct URL>" npx tsx scripts/economy/verify-economy-schema.ts
const MIGRATION = '20261015180000_berry_economy'
type Row = Record<string, unknown>

async function main() {
  const db = new PrismaClient()
  try {
    await db.$executeRawUnsafe('SET TRANSACTION READ ONLY').catch(() => undefined)
    const target = await db.$queryRaw<Row[]>`SELECT current_database() AS db, current_setting('server_version') AS version`
    const applied = await db.$queryRaw<Row[]>`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at`
    const pending = applied.filter(m => !m.finished_at || m.rolled_back_at).map(m => m.migration_name)
    const has = applied.some(m => m.migration_name === MIGRATION && m.finished_at && !m.rolled_back_at)
    const tables = await db.$queryRaw<Row[]>`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('BerryTransaction', 'VirtualDisplay')`
    const columns = await db.$queryRaw<Row[]>`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND ((table_name = 'User' AND column_name = 'berries') OR (table_name = 'BoosterOpening' AND column_name IN ('displayId', 'displayIndex', 'berryTransactionId')))`
    const constraint = await db.$queryRaw<Row[]>`SELECT conname FROM pg_constraint WHERE conname = 'User_berries_non_negative'`
    const index = await db.$queryRaw<Row[]>`SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'VirtualDisplay_open_per_set_key'`
    const users = await db.$queryRaw<Row[]>`SELECT count(*)::int AS n FROM "User"`
    const report = {
      database: target[0], migrationsRecorded: applied.length, unfinishedOrRolledBack: pending, berryMigrationApplied: has,
      tables: tables.map(t => t.table_name), columns: columns.map(c => `${c.table_name}.${c.column_name}`),
      nonNegativeConstraint: constraint.length === 1, oneOpenBoxIndex: index.length === 1, users: users[0].n,
    }
    const complete = has && tables.length === 2 && columns.length === 4 && report.nonNegativeConstraint && report.oneOpenBoxIndex
    console.log(JSON.stringify(report, null, 2))
    console.log(complete ? 'RESULT: economy schema present' : has ? 'RESULT: migration recorded but schema incomplete, investigate' : 'RESULT: economy migration not applied yet')
    process.exitCode = complete || !has ? 0 : 1
  } finally { await db.$disconnect() }
}
void main()
