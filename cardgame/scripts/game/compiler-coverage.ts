import { readFileSync } from 'node:fs'
import { compileCardText } from '../../src/game/cards/textCompiler'

// M7 — read-only coverage of the text compiler on official English card list snapshots: how many cards compile entirely, and
// the most frequent unrecognised wordings (numbers and names abstracted) to decide which template to add next.
// npx tsx scripts/game/compiler-coverage.ts data/official-en/cards-OP-17.json [more files...] [--list]
const files = process.argv.slice(2).filter(a => !a.startsWith('--')), list = process.argv.includes('--list')
const seen = new Map<string, { code: string; type: string; effect: string; trigger: string }>()
for (const f of files) for (const r of JSON.parse(readFileSync(f, 'utf8'))) { const n = r.code.replace(/(?:_[pr]\d+)+$/i, ''); if (!seen.has(n)) seen.set(n, r) }
const shapes = new Map<string, number>(), ok: string[] = [], ko: string[] = []
for (const [n, r] of seen) {
  const c = compileCardText(r, `${n}@x`)
  if (!c.unparsed.length) ok.push(n); else ko.push(n)
  for (const u of c.unparsed) { const k = u.replace(/\[[^\]]*\]/g, m => /^\[(On Play|When Attacking|On K\.O\.|Main|Counter|Activate: ?Main|End of Your Turn|On Block|Trigger|Once Per Turn|Your Turn|Opponent's Turn|DON!! x\d)\]$/.test(m) ? m : '[N]').replace(/\{[^}]+\}/g, '{T}').replace(/\d+/g, '#').slice(0, 140); shapes.set(k, (shapes.get(k) ?? 0) + 1) }
}
console.log(`cartes ${seen.size} | compilées ${ok.length} (${Math.round(100 * ok.length / seen.size)} %) | à revoir ${ko.length}`)
for (const [k, v] of [...shapes].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(String(v).padStart(3), k)
if (list) console.log('compilées:', ok.join(' '))
