import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

// M6 — copies each Leader's Life (stored in the `cost` field of LEADER rows in cardgame/carteJson) into Card.cost.
// Dry run by default (prints the planned changes). `--apply` writes; a non-local database also needs `--allow-remote`.
// Only LEADER rows whose cost is NULL or different are touched; nothing else is read or written.
const apply = process.argv.includes('--apply'), remote = process.argv.includes('--allow-remote')
const url = new URL(process.env.DATABASE_URL || 'invalid://')
const local = ['localhost', '127.0.0.1'].includes(url.hostname)
if (apply && !local && !remote) throw new Error(`refusing to write to ${url.hostname}: pass --allow-remote explicitly`)
const lives = new Map<string, number>()
for (const dir of readdirSync(resolve('carteJson'), { withFileTypes: true }).filter(d => d.isDirectory() && d.name !== 'nouvelle')) {
  for (const f of readdirSync(resolve('carteJson', dir.name)).filter(f => f.endsWith('.json'))) {
    for (const row of JSON.parse(readFileSync(resolve('carteJson', dir.name, f), 'utf8')) as { code: string; type: string; cost: string }[]) {
      if (row.type === 'LEADER' && /^\d+$/.test(String(row.cost))) lives.set(row.code.replace(/_p\d+$/i, '').toUpperCase(), Number(row.cost))
    }
  }
}
async function main() {
  const db = new PrismaClient()
  const rows = await db.card.findMany({ where: { type: { in: ['LEADER', 'Leader', 'leader'] } }, select: { id: true, code: true, cost: true } })
  const plan = rows.map(r => ({ ...r, life: lives.get(r.code.replace(/_p\d+$/i, '').toUpperCase()) })).filter(r => r.life !== undefined && r.cost !== r.life)
  console.log(JSON.stringify({ database: url.hostname, leaders: rows.length, knownLives: lives.size, toUpdate: plan.length, sample: plan.slice(0, 5).map(r => `${r.code}: ${r.cost} -> ${r.life}`), apply }))
  if (apply) { await db.$transaction(plan.map(r => db.card.update({ where: { id: r.id }, data: { cost: r.life! } }))); console.log(`updated ${plan.length} rows`) }
  await db.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
