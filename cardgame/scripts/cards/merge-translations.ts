import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Merges reviewed translation batches ({ "<number>": { effect?, trigger? } }) into src/lib/cards/translations-fr.json,
// stamping each one with the fingerprint of the English text it translates (todo.json from export-untranslated.ts).
// Every entry is checked: same text blocks, every number of the English text kept, bracket keywords mapped.
// Usage: npx tsx scripts/cards/merge-translations.ts <dir with todo.json> <batches dir>
const [workDir, batchDir] = process.argv.slice(2)
if (!workDir || !batchDir) throw new Error('Usage: merge-translations.ts <work dir> <batches dir>')
const target = 'src/lib/cards/translations-fr.json'
type Todo = { number: string; effect: string; trigger: string; en: string }
const todo = new Map((JSON.parse(readFileSync(join(workDir, 'todo.json'), 'utf8')) as Todo[]).map(t => [t.number, t]))
const KEYWORDS: Record<string, string> = { 'On Play': 'Jouée', 'When Attacking': 'En attaquant', 'Activate: Main': 'Activation : Principale', Main: 'Principale', Counter: 'Contre', Trigger: 'Déclenchement', Blocker: 'Bloqueur', Rush: 'Initiative', 'Rush: Character': 'Initiative : Personnage', 'Double Attack': 'Double attaque', Banish: 'Exil', Unblockable: 'Imblocable', 'On K.O.': 'En cas de KO', 'On Block': 'En bloquant', "On Your Opponent's Attack": 'Attaque adverse', 'End of Your Turn': 'Fin de votre tour', "End of Your Opponent's Turn": 'Fin du tour adverse', 'Your Turn': 'Votre tour', "Opponent's Turn": 'Tour adverse', 'Once Per Turn': 'Une fois par tour' }
const CIRCLED: Record<string, string> = { '➀': '1', '➁': '2', '➂': '3', '➃': '4', '➄': '5', '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5', '⑥': '6' }
// « your 1 Leader » reads « votre Leader » in French: that implicit 1 is not compared.
const numbers = (text: string) => (text.replace(/\byour 1 (active )?Leader\b/g, 'your Leader').replace(/[➀-➄①-⑥]/g, c => ` ${CIRCLED[c]} `).match(/\d+/g) ?? []).sort()
const keywords = (text: string, fr: boolean) => [...text.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]).filter(k => fr ? Object.values(KEYWORDS).includes(k) || /^DON!! x\d$/.test(k) : k in KEYWORDS || /^DON!! x\d$/.test(k)).map(k => fr ? k : KEYWORDS[k] ?? k).sort()

const cards: Record<string, { effect?: string; trigger?: string; en: string }> = {}, problems: string[] = []
for (const file of readdirSync(batchDir).filter(f => f.endsWith('.json')).sort()) {
  for (const [number, t] of Object.entries(JSON.parse(readFileSync(join(batchDir, file), 'utf8')) as Record<string, { effect?: string; trigger?: string }>)) {
    const source = todo.get(number)
    if (!source) { problems.push(`${number}: absent de todo.json`); continue }
    for (const block of ['effect', 'trigger'] as const) {
      const en = source[block].trim(), fr = (t[block] ?? '').trim()
      if (!!en !== !!fr) { problems.push(`${number}.${block}: bloc ${en ? 'manquant' : 'en trop'}`); continue }
      if (!en) continue
      if (numbers(en).join() !== numbers(fr).join()) problems.push(`${number}.${block}: nombres ${numbers(en).join(' ')} ≠ ${numbers(fr).join(' ')}`)
      if (keywords(en, false).join() !== keywords(fr, true).join()) problems.push(`${number}.${block}: mots-clés ${keywords(en, false).join(' ')} ≠ ${keywords(fr, true).join(' ')}`)
    }
    cards[number] = { ...(t.effect ? { effect: t.effect.trim() } : {}), ...(t.trigger ? { trigger: t.trigger.trim() } : {}), en: source.en }
  }
}
if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1 }
const current = JSON.parse(readFileSync(target, 'utf8'))
writeFileSync(target, JSON.stringify({ ...current, cards: Object.fromEntries(Object.entries(cards).sort(([a], [b]) => a.localeCompare(b))) }, null, 1) + '\n')
console.log('traductions', Object.keys(cards).length, '/', todo.size, 'problèmes', problems.length)
