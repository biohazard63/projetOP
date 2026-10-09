import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { randomInt } from 'node:crypto'
import { generateBooster } from '../src/lib/boosters/generator'
import { getBoosterCatalog, getBoosterDrawContext } from '../src/lib/boosters/service'
// Read-only diagnostic; exactly the same generator/configuration as real openings.
const db = new PrismaClient()
async function main() {
 const args = process.argv.slice(2)
 const setArg = args.findIndex(a => a === '--set' || a === '-s')
 const runsArg = args.findIndex(a => a === '--runs' || a === '-n')
 const code = setArg >= 0 ? args[setArg + 1] : undefined
 const runs = runsArg >= 0 ? Number(args[runsArg + 1]) : 100
 if (!Number.isInteger(runs) || runs < 1 || runs > 100000) throw new Error('--runs must be an integer from 1 to 100000')
 const contexts = await db.$transaction(async tx => {
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
  const codes = code ? [code] : (await getBoosterCatalog(tx)).filter(set => set.available).map(set => set.code)
  return Promise.all(codes.map(value => getBoosterDrawContext(tx, value)))
 }, { timeout: 20000 })
 for (const ctx of contexts) {
  const counts: Record<string, number> = {}; let special = 0
  for (let n = 0; n < runs; n++) {
   const draw = generateBooster(ctx.pool, ctx.set.code, ctx.rules, () => randomInt(0, 0x100000000) / 0x100000000, ctx.weights)
   if (draw.specialPack) special++
   for (const card of draw.cards) counts[card.rarity] = (counts[card.rarity] || 0) + 1
  }
  console.log(JSON.stringify({ setCode: ctx.set.code, runs, packSize: ctx.rules.slots.length, source: ctx.rules.source, counts, special, warnings: ctx.warnings }))
 }
 if (!contexts.length) console.log('No eligible extensions; no cards or rules were modified.')
}
main().catch(() => { console.error('Simulation impossible : vérifier l’extension, les règles et la connexion. Aucune donnée modifiée.'); process.exitCode = 1 }).finally(() => db.$disconnect())
