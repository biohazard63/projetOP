import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { compileCardText } from '../../src/game/cards/textCompiler'

// M7 — groups of not-yet-compiled wordings across every official English snapshot (data/official-en), ranked by the cards each
// group would unlock on its own (cards whose only unknown wording is that group), then by occurrences.
// npx tsx scripts/game/compiler-groups.ts [out.md]
const cards = new Map<string, { code: string; type: string; effect: string; trigger: string }>()
for (const f of readdirSync('data/official-en').filter(f => f.endsWith('.json'))) for (const r of JSON.parse(readFileSync(`data/official-en/${f}`, 'utf8'))) { const n = r.code.replace(/(?:_[pr]\d+)+$/i, ''); if (!cards.has(n)) cards.set(n, r) }
const shape = (u: string) => u.replace(/\[[^\]]*\]/g, m => /^\[(On Play|When Attacking|On K\.O\.|Main|Counter|Activate: ?Main|End of Your Turn|On Block|Trigger|Once Per Turn|Your Turn|Opponent's Turn|DON!! x\d|On Your Opponent's Attack|Blocker|Rush|Double Attack|Banish)\]$/.test(m) ? m.replace(/x\d/, 'xN') : '[Nom]')
  .replace(/\{[^}]+\}/g, '{Type}').replace(/"[^"]+"/g, '"X"').replace(/\([^)]*\)/g, '').replace(/[−–]/g, '-').replace(/\d+/g, 'N').replace(/\s+/g, ' ').trim()
const groups = new Map<string, { unlock: string[]; all: string[] }>()
let ok = 0
for (const [n, r] of cards) {
  const c = compileCardText(r, n)
  if (!c.unparsed.length) { ok++; continue }
  const shapes = [...new Set(c.unparsed.map(shape))]
  for (const sh of shapes) { const g = groups.get(sh) ?? { unlock: [], all: [] }; g.all.push(n); if (shapes.length === 1) g.unlock.push(n); groups.set(sh, g) }
}
const ranked = [...groups].sort((a, b) => b[1].unlock.length - a[1].unlock.length || b[1].all.length - a[1].all.length)
const lines = [`# Groupes d'effets à ajouter au compilateur (M7)`, '', `${cards.size} cartes uniques dans les listes officielles anglaises (data/official-en). Déjà compilées entièrement : ${ok} (${Math.round(100 * ok / cards.size)} %).`, '',
  'Classement : cartes débloquées par le groupe seul (leur seule formulation inconnue), puis nombre de cartes où il apparaît. Formes abstraites : N = nombre, [Nom] = nom de carte, {Type} = type.', '',
  '| # | Débloque | Apparaît | Formulation | Exemples |', '|---|---|---|---|---|',
  ...ranked.map(([sh, g], i) => `| ${i + 1} | ${g.unlock.length} | ${g.all.length} | ${sh.replace(/\|/g, '/').slice(0, 170)} | ${(g.unlock.length ? g.unlock : g.all).slice(0, 4).join(', ')} |`)]
const out = process.argv[2]
if (out) writeFileSync(out, lines.join('\n') + '\n')
console.log(lines.slice(0, 2 + 6 + 32).join('\n'))
