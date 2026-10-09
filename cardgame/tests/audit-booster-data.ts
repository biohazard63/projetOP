import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function audit() {
 const data = await db.$transaction(async tx => {
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
  return {
   sets: await tx.cardSet.findMany({ select: { code: true, name: true, _count: { select: { cards: true, boosters: true } } } }),
   cards: await tx.card.groupBy({ by: ['setCode', 'rarity'], _count: true }),
   unlinkedCards: await tx.card.count({ where: { setCode: null } }),
   rules: await tx.setRules.findMany({ select: { code: true, boosterRules: true } }),
   boosters: await tx.booster.findMany({ select: { id: true, setCode: true, price: true, _count: { select: { cards: true, openings: true } } } }),
  }
 }, { timeout: 20000 })
 console.log(JSON.stringify(data, null, 2))
}
audit().catch(() => { console.log(JSON.stringify({ status: 'BLOCKED', reason: 'Configured PostgreSQL unavailable for read-only inventory' })); process.exitCode = 1 }).finally(() => db.$disconnect())
