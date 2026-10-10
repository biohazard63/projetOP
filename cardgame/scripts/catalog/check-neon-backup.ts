import { PrismaClient } from '@prisma/client'
import fs from 'node:fs/promises'
import { digest, stableJson } from './core'

async function inspect(db: PrismaClient) {
  return db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
    const columns = await tx.$queryRawUnsafe<{ table_name: string; column_name: string; udt_name: string; is_nullable: string; column_default: string | null }[]>("SELECT table_name,column_name,udt_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position")
    const tables = [...new Set(columns.map(c => c.table_name))]
    const summaries: Record<string, { rows: number; digest: string }> = {}
    for (const name of tables) {
      const escaped = name.replaceAll('"', '""')
      const rows = await tx.$queryRawUnsafe<{ value: unknown }[]>(`SELECT row_to_json(t) AS value FROM public."${escaped}" t`)
      summaries[name] = { rows: rows.length, digest: digest(rows.map(r => stableJson(r.value)).sort().join('\n')) }
    }
    return { columns, tables: summaries }
  }, { timeout: 120000, isolationLevel: 'RepeatableRead' })
}

async function main() {
  const url = process.env.NEON_DATABASE_URL
  if (!url) throw new Error('NEON_DATABASE_URL requise')
  const target = new URL(url)
  if (target.hostname !== 'ep-jolly-waterfall-abgp5rsh-pooler.eu-west-2.aws.neon.tech' || target.pathname !== '/neondb' || target.searchParams.get('sslmode') !== 'require') throw new Error('Cible Neon inattendue : connexion refusée')
  const remote = new PrismaClient({ datasourceUrl: url })
  const restored = new PrismaClient({ datasourceUrl: 'postgresql://op_test:op_test_local_only@127.0.0.1:55432/cardgame_restore_check_20261010_171422?schema=public' })
  try {
    const [source, destination] = await Promise.all([inspect(restored), inspect(remote)])
    const sourceColumns = new Map(source.columns.map(c => [`${c.table_name}.${c.column_name}`, c]))
    const targetColumns = new Map(destination.columns.map(c => [`${c.table_name}.${c.column_name}`, c]))
    const schemaDifferences = [...new Set([...sourceColumns.keys(), ...targetColumns.keys()])].flatMap(key => {
      const a = sourceColumns.get(key); const b = targetColumns.get(key)
      return stableJson(a) === stableJson(b) ? [] : [{ key, source: a || null, neon: b || null }]
    })
    const dataDifferences = [...new Set([...Object.keys(source.tables), ...Object.keys(destination.tables)])].flatMap(table => {
      const a = source.tables[table]; const b = destination.tables[table]
      return a?.digest === b?.digest ? [] : [{ table, sourceRows: a?.rows ?? null, neonRows: b?.rows ?? null }]
    })
    const empty = Object.keys(destination.tables).length === 0
    const report = { checkedAt: new Date().toISOString(), readOnly: true, productionModified: false,
      fullRestoreIntoEmptyDatabasePossible: empty, source, neon: destination, schemaDifferences, dataDifferences,
      conclusion: empty ? 'Cible sans tables : préparer sauvegarde de la cible avant restauration complète.' : 'Cible déjà occupée : une restauration complète ne peut pas être appliquée telle quelle sans conflit ou remplacement de données. Ne pas utiliser --clean.' }
    const file = '.local-backups/neon-compatibility-20261010.json'
    await fs.writeFile(file, JSON.stringify(report, null, 2), { mode: 0o600 })
    console.log(JSON.stringify({ report: file, sourceTables: Object.keys(source.tables).length, neonTables: Object.keys(destination.tables).length,
      sourceCards: source.tables.Card?.rows, neonCards: destination.tables.Card?.rows,
      schemaDifferences: schemaDifferences.length, dataDifferences: dataDifferences.length, destinationEmpty: empty,
      productionModified: false, conclusion: report.conclusion }, null, 2))
  } finally { await Promise.all([remote.$disconnect(), restored.$disconnect()]) }
}
void main().catch(e => { console.error('Vérification interrompue', { type: e instanceof Error ? e.name : 'unknown', code: e && typeof e === 'object' && 'code' in e ? e.code : undefined }); process.exitCode = 1 })
