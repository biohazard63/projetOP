import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolveByRebuildScriptName, resolveStarterCompositionName } from '../../src/game/cards/starterCompositionResolution'

// M6 — read-only extraction of Starter Deck compositions. The rebuild script is parsed as TEXT (never executed:
// it deletes and recreates decks). Each named entry is resolved to a card number from the local cardJson rows of
// the deck's own set; when the set has no such card, the script's own cross-set name lookup is applied (one card number
// only). An entry that matches no card, or several distinct numbers, is reported, never guessed.
// npx tsx scripts/game/extract-starter-compositions.ts src/game/cards/starter-compositions.json
type Row = { code: string; name: string; type: string }
const out = process.argv[2]
if (!out) throw new Error('usage: extract-starter-compositions.ts <output.json>')
const script = readFileSync(resolve('scripts/rebuildStarterDecks.ts'), 'utf8')
// The audited reference has explicit numbers and source gates. Never let the old name-only regex export an empty
// or silently substituted /play manifest. Migrating that runtime manifest is a separate, reviewed task.
if (script.includes('cardNumber:')) throw new Error('Audited Starter reference detected: use rebuildStarterDecks.ts --dry-run. Legacy /play manifest was not modified.')
const base = (code: string) => code.replace(/_p\d+$/i, '').toUpperCase()

function rowsOf(deckCode: string): Row[] {
  const dir = resolve('carteJson', deckCode)
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter(f => f.endsWith('.json')).flatMap(f => JSON.parse(readFileSync(resolve(dir, f), 'utf8')) as Row[])
}

const allRows: Row[] = readdirSync(resolve('carteJson'), { withFileTypes: true }).filter(d => d.isDirectory() && d.name !== 'nouvelle')
  .flatMap(d => existsSync(resolve('carteJson', d.name, `cards-${d.name}.json`)) ? JSON.parse(readFileSync(resolve('carteJson', d.name, `cards-${d.name}.json`), 'utf8')) as Row[] : [])
const decks: unknown[] = []
for (const block of script.matchAll(/deckName:\s*'([^']*)',\s*deckCode:\s*'(ST-\d{2})',\s*cards:\s*\[([\s\S]*?)\]\s*\}/g)) {
  const [, deckName, deckCode, body] = block
  const rows = rowsOf(deckCode)
  const entries = [...body.matchAll(/\{\s*name:\s*(['"])(.*?)\1,\s*quantity:\s*(\d+)\s*\}/g)].map(m => ({ name: m[2], quantity: Number(m[3]) }))
  const explicitLeader = entries.some(e => /leader/i.test(e.name))
  const resolved = entries.map((entry, index) => {
    const inferLeader = !explicitLeader && index === 0 && entry.quantity === 1
    const local = resolveStarterCompositionName(deckCode, entry.name, rows, { inferLeader })
    const result = local.status === 'NOT_FOUND' ? resolveByRebuildScriptName(entry.name, allRows, /leader/i.test(entry.name) || (!explicitLeader && entry.quantity === 1)) : local
    return { name: entry.name, quantity: entry.quantity, ...result }
  })
  const leader = resolved.filter(e => e.number && (rows.find(r => base(r.code) === e.number) ?? allRows.find(r => base(r.code) === e.number))?.type === 'LEADER')
  const main = resolved.filter(e => !leader.includes(e))
  decks.push({ deckCode, deckName, localCards: rows.length > 0, leaders: leader.map(e => e.number), mainCount: main.reduce((n, e) => n + e.quantity, 0), unresolved: resolved.filter(e => e.status !== 'RESOLVED').length, entries: resolved })
}
writeFileSync(out, JSON.stringify({ source: 'cardgame/scripts/rebuildStarterDecks.ts (parsed as text, not executed) + cardgame/carteJson', note: 'Quantities come from the rebuild script; numbers are resolved inside each deck\'s own cardJson set, else by the script\'s own cross-set name lookup when it gives one card number. ST-29..ST-36 are absent from the script.', decks }, null, 1) + '\n')
for (const d of decks as { deckCode: string; leaders: string[]; mainCount: number; unresolved: number; localCards: boolean }[]) console.log(d.deckCode, 'leaders', d.leaders.join('/') || '-', 'main', d.mainCount, 'unresolved', d.unresolved, d.localCards ? '' : 'NO LOCAL CARDS')
