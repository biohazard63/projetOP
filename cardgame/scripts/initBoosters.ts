import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { getBoosterCatalog, getSimulationBoosterId } from '../src/lib/boosters/service'
// Default is a read-only preview. Real openings initialize their own descriptor atomically.
const db = new PrismaClient()
async function main() {
 const apply = process.argv.includes('--apply')
 if (apply) {
  const url = new URL(process.env.DATABASE_URL || '')
  if (url.hostname !== '127.0.0.1' || url.port !== '55432' || url.pathname !== '/op_boosters_test') throw new Error('--apply only permits the isolated booster test database')
 }
 const catalog = await db.$transaction(async tx => { await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY'); return getBoosterCatalog(tx) }, { timeout: 20000 })
 for (const set of catalog) {
  if (!set.available) { console.log(`${set.code}: unavailable; no writes`); continue }
  if (apply) await db.booster.upsert({ where: { id: getSimulationBoosterId(set.code) }, update: {}, create: { id: getSimulationBoosterId(set.code), name: `Simulation · ${set.name}`, description: 'Ouverture gratuite du simulateur', price: 0, setCode: set.code, imageUrl: set.imageUrl } })
  console.log(`${set.code}: ${apply ? 'initialized' : 'preview only'}; free simulator; ${set.packSize} slots`)
 }
}
main().catch(() => { console.error('Initialisation refusée ou indisponible. Aucune suppression ni reconfiguration de règles.'); process.exitCode = 1 }).finally(() => db.$disconnect())
