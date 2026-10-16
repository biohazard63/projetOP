// M7 — read-only scan: every compiled card's abilities run in the real-game harness (tests/helpers/m7Compiled.ts); lists those that
// pass (candidates for FAQ review) and the failure reasons. npx tsx scripts/game/compiler-scan.ts <out.json> [shard/shards]
import { writeFileSync } from 'node:fs'
import { compiledCards } from '../../src/lib/engine/catalog'
import { runAbility, runPrinted, runStatic } from '../../tests/helpers/m7Compiled'
const ok: string[] = [], bad = new Map<string, string[]>()
const [shard, shards] = (process.argv[3] ?? '0/1').split('/').map(Number)
const list = compiledCards().filter((_, i) => i % shards === shard)
let done = 0
for (const c of list) {
  const t0 = Date.now()
  const reasons: string[] = []
  for (const a of c.abilities) for (let m = 0; m < Math.max(1, ...a.program.map(st => st.kind === 'MODE' ? st.modes : 1)); m++) { const r = runAbility(c, a, m); if (!r.ok) reasons.push(`${a.id}#${m}:${r.reason}`) }
  for (const x of [...c.continuous, ...c.conditionalKeywords, ...c.attackProhibitions]) { const r = runStatic(c, x); if (!r.ok) reasons.push(`${x.id}:${r.reason}`) }
  const p = runPrinted(c); if (!p.ok) reasons.push(`printed:${p.reason}`)
  if (reasons.length) bad.set(c.number, reasons); else ok.push(c.number)
  console.log(`${++done}/${list.length} ${c.number} ${Date.now() - t0}ms ${reasons.length ? 'KO' : 'OK'}`)
}
writeFileSync(process.argv[2], JSON.stringify({ ok, bad: Object.fromEntries(bad) }, null, 1))
const tally = new Map<string, number>(); for (const r of [...bad.values()].flat()) { const k = r.replace(/^[^:]*:/, '').slice(0, 50); tally.set(k, (tally.get(k) ?? 0) + 1) }
console.log('ok', ok.length, 'bad', bad.size); for (const [k, v] of [...tally].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(v, k)
