import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// M6 — read-only extraction of the audited Starter Deck compositions. scripts/rebuildStarterDecks.ts is parsed as TEXT
// (never imported or executed); every entry carries an explicit cardNumber, printingCode, type and quantity. The source
// gate of scripts/starterAudit/product-evidence.json (compositionVerified, reasons) is copied as is: an unverified deck is
// exported but never offered in /play. No name matching takes place.
// npx tsx scripts/game/extract-audited-starter-compositions.ts src/game/cards/starter-compositions.json
type Evidence = Record<string, { compositionVerified: boolean; reasons: string[]; donCount: number | null }>
const out = process.argv[2]
if (!out) throw new Error('usage: extract-audited-starter-compositions.ts <output.json>')
const script = readFileSync(resolve('scripts/rebuildStarterDecks.ts'), 'utf8')
const evidence = JSON.parse(readFileSync(resolve('scripts/starterAudit/product-evidence.json'), 'utf8')) as Evidence
const entry = /\{\s*name:\s*(['"])((?:\\.|(?!\1).)*)\1,\s*quantity:\s*(\d+),\s*cardNumber:\s*'([^']+)',\s*type:\s*'(LEADER|CHARACTER|EVENT|STAGE)',\s*printingCode:\s*'([^']+)'\s*\}/g
const header = /deckName:\s*(['"])((?:\\.|(?!\1).)*)\1,\s*deckCode:\s*'(ST-\d{2})',\s*cards:\s*\[/g

const blocks = [...script.matchAll(header)]
const decks = blocks.map((block, index) => {
  const body = script.slice(block.index! + block[0].length, blocks[index + 1]?.index ?? script.length)
  const deckCode = block[3], deckName = block[2].replace(/\\(.)/g, '$1')
  const entries = [...body.matchAll(entry)].map(m => ({ name: m[2].replace(/\\(.)/g, '$1'), number: m[4], printingCode: m[6], type: m[5], quantity: Number(m[3]) }))
  if (!entries.length) throw new Error(`NO_ENTRY:${deckCode}`)
  for (const e of entries) if (!/^(?:(?:ST|OP|EB|PRB)\d{2}|P)-\d{3}$/.test(e.number) || !e.printingCode.toUpperCase().startsWith(e.number)) throw new Error(`INVALID_NUMBER:${deckCode}:${e.number}`)
  const gate = evidence[deckCode]
  if (!gate) throw new Error(`NO_EVIDENCE:${deckCode}`)
  const leaders = entries.filter(e => e.type === 'LEADER').map(e => e.number)
  const mainCount = entries.filter(e => e.type !== 'LEADER').reduce((n, e) => n + e.quantity, 0)
  return { deckCode, deckName, compositionVerified: gate.compositionVerified === true, reasons: gate.reasons ?? [], donCount: gate.donCount, leaders, mainCount, entries }
})
const missing = Object.keys(evidence).filter(code => !decks.some(d => d.deckCode === code))
writeFileSync(out, JSON.stringify({
  source: 'cardgame/scripts/rebuildStarterDecks.ts (audited list parsed as text, not executed) + cardgame/scripts/starterAudit/product-evidence.json',
  note: 'Numbers, printings and quantities are the audited published contents. A deck with several Leaders is played with exactly one of them; the others are not part of the 50 cards.',
  absent: missing.map(code => ({ deckCode: code, reasons: evidence[code].reasons })), decks }, null, 1) + '\n')
for (const d of decks) console.log(d.deckCode, d.compositionVerified ? 'VERIFIED' : `UNVERIFIED ${d.reasons.join(',')}`, 'leaders', d.leaders.join('/'), 'main', d.mainCount)
for (const m of missing) console.log(m, 'ABSENT', evidence[m].reasons.join(','))
