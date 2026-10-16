import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { compileCardText, unknownFragments } from '../../src/game/cards/textCompiler'

// M7 — the unknown pieces of every not-yet-compiled card (all official English snapshots), ranked greedily: at each rank the
// piece that, added to the pieces above it, completes the most new cards. Pieces are abstracted (numbers, names, types).
// npx tsx scripts/game/compiler-fragments.ts [out.md]
const cards = new Map<string, { code: string; type: string; effect: string; trigger: string }>()
for (const f of readdirSync('data/official-en').filter(f => f.endsWith('.json'))) for (const r of JSON.parse(readFileSync(`data/official-en/${f}`, 'utf8'))) { const n = r.code.replace(/(?:_[pr]\d+)+$/i, ''); if (!cards.has(n)) cards.set(n, r) }
const abstract = (t: string) => t.replace(/\[[^\]]*\]/g, m => /^\[(On Play|When Attacking|On K\.O\.|Main|Counter|Activate: ?Main|End of Your Turn|On Block|Trigger|Once Per Turn|Your Turn|Opponent's Turn|On Your Opponent's Attack|Blocker|Rush|Double Attack|Banish)\]$/.test(m) ? m : '[Nom]')
  .replace(/\{[^}]+\}/g, '{Type}').replace(/"[^"]+"/g, '"X"').replace(/[−–]/g, '-').replace(/\d+/g, 'N').replace(/\s+/g, ' ').trim()
const need = new Map<string, Set<string>>(), examples = new Map<string, string[]>()
let compiled = 0
for (const [n, r] of cards) {
  const c = compileCardText(r, n)
  if (!c.unparsed.length) { compiled++; continue }
  const set = new Set<string>()
  for (const u of c.unparsed) for (const f of unknownFragments(u, r.type.trim().toUpperCase() as never)) { const k = `${f.role}: ${abstract(f.text)}`; set.add(k); const ex = examples.get(k) ?? []; if (ex.length < 3) ex.push(n); examples.set(k, ex) }
  if (!set.size) set.add('structure: (découpage ou mot-clé non reconnu)')
  need.set(n, set)
}
const freq = new Map<string, number>()
for (const s of need.values()) for (const k of s) freq.set(k, (freq.get(k) ?? 0) + 1)
// Greedy: repeatedly take the piece that completes the most cards given the pieces already taken (ties: most frequent).
const known = new Set<string>(), ranked: { piece: string; unlocks: number; total: number; freq: number }[] = []
let total = 0
for (let round = 0; round < 400; round++) {
  let best: string | null = null, bestGain = -1
  for (const k of freq.keys()) {
    if (known.has(k)) continue
    let gain = 0
    for (const s of need.values()) if (s.has(k) && [...s].every(x => x === k || known.has(x))) gain++
    if (gain > bestGain || (gain === bestGain && best && freq.get(k)! > freq.get(best)!)) { best = k; bestGain = gain }
  }
  if (!best) break
  known.add(best); total += bestGain
  ranked.push({ piece: best, unlocks: bestGain, total, freq: freq.get(best)! })
}
const lines = ['# Morceaux de texte à ajouter au compilateur (M7)', '', `${cards.size} cartes, ${compiled} déjà compilées (${Math.round(100 * compiled / cards.size)} %). ${freq.size} morceaux inconnus distincts.`, '',
  'Ordre glouton : chaque morceau, ajouté à tous ceux au-dessus de lui, complète « Débloque » cartes de plus (« Cumul » au total). « Fréquence » : cartes où il apparaît.', '',
  '| # | Rôle et morceau | Débloque | Cumul | Fréquence | Exemples |', '|---|---|---|---|---|---|',
  ...ranked.map((x, i) => `| ${i + 1} | ${x.piece.replace(/\|/g, '/').slice(0, 160)} | ${x.unlocks} | ${x.total} | ${x.freq} | ${(examples.get(x.piece) ?? []).join(', ')} |`)]
if (process.argv[2]) writeFileSync(process.argv[2], lines.join('\n') + '\n')
console.log(lines.slice(0, 3).join('\n'))
for (const i of [10, 25, 50, 100, 200, 400]) if (ranked[i - 1]) console.log(`après ${i} morceaux : +${ranked[i - 1].total} cartes`)
console.log(lines.slice(7, 37).join('\n'))
