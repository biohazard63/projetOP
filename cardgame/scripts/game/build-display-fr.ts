import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'

// M6 — French display table for /play: name, text, [Trigger] text and image of every card number that has an official French
// printing. Sources, in order: French rows of the local cardJson (carteJson/, carteJson/nouvelle/), then the official French card
// list snapshots (data/official-fr, scripts/game/official-cardlist-en.ts <id> <label> fr). Display only: rules and certification
// stay on the reviewed English text. A number without a French printing keeps its English display.
// npx tsx scripts/game/build-display-fr.ts src/game/cards/display-fr.json
type Row = { id?: string; code: string; name: string; type: string; effect: string; trigger: string; image?: string; url?: string }
const out = process.argv[2]
if (!out) throw new Error('usage: build-display-fr.ts <output.json>')
const french = (r: Row) => /^(PERSONNAGE|ÉVÉNEMENTS?|EVENEMENTS?|LIEU)$/i.test(r.type) || /fr\.onepiece-cardgame\.com/.test(`${r.image ?? ''}${r.url ?? ''}`)
const files: string[] = []
for (const base of ['carteJson', 'carteJson/nouvelle', 'data/official-fr']) {
  const dir = resolve(base)
  if (!existsSync(dir)) continue
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    if (d.isDirectory()) { const f = join(dir, d.name, `cards-${d.name}.json`); if (existsSync(f)) files.push(f) }
    else if (d.name.endsWith('.json')) files.push(join(dir, d.name))
  }
}
const clean = (t: string) => { const v = (t ?? '').trim(); return v === '-' ? '' : v }
const table: Record<string, { name: string; text: string; trigger: string; image: string | null }> = {}
const rank: Record<string, number> = {}
for (const f of files) {
  for (const r of JSON.parse(readFileSync(f, 'utf8')) as Row[]) {
    if (!french(r)) continue
    const number = r.code.replace(/(?:_[pr]\d+)+$/i, '').toUpperCase()
    // Base printing first (id = number), then the first other printing met.
    const score = (r.id ?? r.code) === r.code ? 2 : 1
    if ((rank[number] ?? 0) >= score) continue
    const image = r.image && /^https:\/\/fr\.onepiece-cardgame\.com\/images\//.test(r.image) ? r.image : null
    table[number] = { name: r.name.trim(), text: clean(r.effect), trigger: clean(r.trigger), image }
    rank[number] = score
  }
}
const sorted = Object.fromEntries(Object.keys(table).sort().map(k => [k, table[k]]))
writeFileSync(resolve(out), JSON.stringify(sorted, null, 1) + '\n')
console.log('French display entries:', Object.keys(sorted).length)
