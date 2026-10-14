import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { engineCatalog } from '../../src/lib/engine/catalog'
import { effectiveStatus } from '../../src/game/cards/certification'
import { STARTER_COMPOSITIONS, starterDecksOf } from '../../src/game/cards/starterDecks'
import { REFERENCE_DECKS, deckEligibility } from '../../src/lib/engine/decks'

// M6 — read-only Starter Deck coverage report (ST-01..ST-35). For every audited deck: unique cards, cards known to the
// engine, certified cards, missing or uncertified cards with the mechanics their text uses, composition problems,
// /play availability and the remaining work. Also lists every uncertified card number once (printings merged), with the
// decks it would unblock. Nothing is written except the optional report file.
// npx tsx scripts/game/starter-coverage.ts [report.json]
type Row = { code: string; name: string; type: string; color: string; effect: string; trigger: string }
const rows = new Map<string, Row>()
for (const dir of readdirSync(resolve('carteJson'), { withFileTypes: true }).filter(d => d.isDirectory() && d.name !== 'nouvelle')) {
  const file = resolve('carteJson', dir.name, `cards-${dir.name}.json`)
  if (!existsSync(file)) continue
  for (const r of JSON.parse(readFileSync(file, 'utf8')) as Row[]) {
    const n = r.code.replace(/(?:_[pr]\d+)+$/i, '').toUpperCase()
    // Prefer an English row (the review language of the engine definitions) when several printings exist.
    if (!rows.has(n) || (/[éèà]|Personnage|Événement/i.test(rows.get(n)!.type + rows.get(n)!.effect) && !/[éèà]/.test(r.effect))) rows.set(n, r)
  }
}
// Official English card list snapshots (data/official-en) fill in cards without an English local row.
const officialDir = resolve('data/official-en')
if (existsSync(officialDir)) for (const f of readdirSync(officialDir).filter(f => f.endsWith('.json'))) {
  for (const r of JSON.parse(readFileSync(resolve(officialDir, f), 'utf8')) as Row[]) {
    const n = r.code.replace(/(?:_[pr]\d+)+$/i, '').toUpperCase(), current = rows.get(n)
    if (!current || /[éèà]|Personnage|Événement/i.test(current.type + current.effect)) rows.set(n, r)
  }
}
const TAGS: [string, RegExp][] = [
  ['blocker', /\[Blocker\]/i], ['rush', /\[Rush\]/i], ['double-attack', /\[Double Attack\]/i], ['banish', /\[Banish\]/i],
  ['on-play', /\[On Play\]/i], ['when-attacking', /\[When Attacking\]/i], ['on-ko', /\[On K\.O\.\]/i], ['activate-main', /\[Activate: ?Main\]/i],
  ['main', /\[Main\]/i], ['counter', /\[Counter\]/i], ['trigger', /\[Trigger\]/i], ['end-of-turn', /\[End of Your Turn\]/i], ['on-block', /\[On Block\]/i],
  ['opponent-turn', /\[Opponent's Turn\]/i], ['your-turn', /\[Your Turn\]/i], ['once-per-turn', /\[Once Per Turn\]/i],
  ['don-minus', /DON!! ?[−-] ?\d/i], ['don-x', /\[DON!! ?x\d\]/i], ['give-don', /(give|add).{0,40}DON!!/i], ['draw', /\bdraw\b/i],
  ['trash', /\btrash\b/i], ['ko', /\bK\.O\./], ['rest', /\brest\b/i], ['set-active', /set .{0,40}active/i], ['return-hand', /to (the|its) owner'?s hand|return .{0,60}to .{0,10}hand/i],
  ['deck-bottom', /bottom of .{0,20}deck/i], ['look-reveal', /\b(look at|reveal)\b/i], ['life', /\bLife\b/], ['power', /[+−-]\d{3,4} power|power/i],
  ['cost-mod', /cost .{0,10}[+−-]\d|[+−-]\d cost/i], ['play-card', /\bplay (up to|this)/i], ['cannot', /\bcannot\b/i], ['leader-cond', /If your Leader/i],
]
const tagsOf = (text: string) => TAGS.filter(([, re]) => re.test(text)).map(([t]) => t)

const { definitions } = engineCatalog()
const byNumber = new Map(definitions.map(d => [d.number, d]))
const offered = new Set(REFERENCE_DECKS.map(d => d.id))
type Card = { number: string; name: string; status: 'CERTIFIED' | 'RECOGNIZED' | 'ABSENT'; tags: string[] }
const uncertified = new Map<string, Card & { decks: string[] }>()
const decks = STARTER_COMPOSITIONS.map(c => {
  const numbers = [...new Set(c.entries.map(e => e.number))]
  const cards: Card[] = numbers.map(n => {
    const d = byNumber.get(n), row = rows.get(n)
    return { number: n, name: row?.name ?? c.entries.find(e => e.number === n)!.name, status: !d ? 'ABSENT' : effectiveStatus(d) === 'PLAYABLE_VERIFIED' ? 'CERTIFIED' : 'RECOGNIZED',
      tags: tagsOf(`${row?.effect ?? ''} ${row?.trigger ?? ''}`) }
  })
  const problems = [...(c.compositionVerified ? [] : ['COMPOSITION_UNVERIFIED', ...c.reasons]), ...(c.mainCount !== 50 ? [`MAIN_COUNT_${c.mainCount}`] : []), ...(c.leaders.length ? [] : ['NO_LEADER']),
    ...numbers.filter(n => !rows.has(n)).map(n => `NO_CARD_TEXT:${n}`)]
  const playable = starterDecksOf(c)
  const allCertified = cards.every(x => x.status === 'CERTIFIED')
  const eligibility = allCertified ? playable.map(d => ({ id: d.id, ...deckEligibility(d.entries) })) : []
  for (const x of cards) if (x.status !== 'CERTIFIED') {
    const u = uncertified.get(x.number) ?? { ...x, decks: [] }
    u.decks.push(c.deckCode); uncertified.set(x.number, u)
  }
  const remaining = cards.filter(x => x.status !== 'CERTIFIED')
  return { deckCode: c.deckCode, deckName: c.deckName, leaders: c.leaders, uniqueCards: numbers.length, recognized: cards.filter(x => x.status !== 'ABSENT').length,
    certified: cards.filter(x => x.status === 'CERTIFIED').length, absent: cards.filter(x => x.status === 'ABSENT').map(x => x.number),
    uncertified: cards.filter(x => x.status === 'RECOGNIZED').map(x => x.number), problems, eligibility,
    inPlay: playable.map(d => ({ id: d.id, offered: offered.has(d.id) })),
    remainingWork: problems.length ? `blocked: ${problems.join(', ')}` : remaining.length ? `${remaining.length} card(s) to certify: ${remaining.map(x => `${x.number} [${x.tags.join(' ')}]`).join('; ')}` : 'none',
    remainingCount: problems.length ? 999 : remaining.length }
}).sort((a, b) => a.remainingCount - b.remainingCount || a.deckCode.localeCompare(b.deckCode))
const global = [...uncertified.values()].sort((a, b) => b.decks.length - a.decks.length || a.number.localeCompare(b.number))
const tagCounts = Object.fromEntries(TAGS.map(([t]) => [t, global.filter(g => g.tags.includes(t)).length]).filter(([, n]) => (n as number) > 0).sort((a, b) => (b[1] as number) - (a[1] as number)))
const report = { generatedFrom: 'starter-compositions.json + engine catalog + certification', decks, uncertifiedCards: global, tagCounts }
if (process.argv[2]) writeFileSync(resolve(process.argv[2]), JSON.stringify(report, null, 1) + '\n')
for (const d of decks) console.log(`${d.deckCode.padEnd(6)} ${String(d.certified).padStart(2)}/${String(d.uniqueCards).padEnd(2)} certified · ${d.inPlay.some(p => p.offered) ? 'IN /play' : 'not offered'}${d.problems.length ? ' · ' + d.problems.join(',') : ''} · todo ${d.remainingCount === 999 ? '—' : d.remainingCount}`)
console.log(`uncertified unique cards: ${global.length} (absent ${global.filter(g => g.status === 'ABSENT').length})`)
console.log('mechanics:', JSON.stringify(tagCounts))
