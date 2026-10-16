import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'node:fs'
import { cardNumber, englishFingerprint, frenchText } from '../../src/lib/cards/frenchText'
import OFFICIAL from '../../src/game/cards/display-fr.json'

// Read-only export for the unofficial translations (src/lib/cards/translations-fr.json):
//  - todo.json: one entry per card number whose English texts have no French version yet;
//  - pairs.json: English/French pairs of the official French reprints, the reference for Bandai's French wording.
// Usage: npx tsx scripts/cards/export-untranslated.ts <output dir>
const out = process.argv[2]
if (!out) throw new Error('Usage: export-untranslated.ts <output dir>')
const english = (text: string) => /\b(your|opponent|Character|this turn|Draw|cards?|Leader|power|DON!! card)\b/.test(text) && !/\b(votre|adverse|Personnage|ce tour|Piochez)\b/.test(text)

async function main() {
  const db = new PrismaClient()
  try {
    const cards = await db.card.findMany({ select: { id: true, code: true, name: true, effect: true, trigger: true }, orderBy: { id: 'asc' } })
    const todo = new Map<string, { number: string; name: string; effect: string; trigger: string; en: string }>(), pairs = new Map<string, { en: string; fr: string }>()
    for (const card of cards) {
      const number = cardNumber(card), effect = (card.effect ?? '').trim(), trigger = (card.trigger ?? '').trim()
      if (!english(`${effect} ${trigger}`)) continue
      const official = (OFFICIAL as Record<string, { text: string; trigger: string }>)[number]
      if (frenchText(card)?.source === 'official' && official) { pairs.set(number, { en: [effect, trigger].filter(Boolean).join(' || Trigger: '), fr: [official.text, official.trigger].filter(Boolean).join(' || Trigger: ') }); continue }
      if (!todo.has(number) && !frenchText(card)) todo.set(number, { number, name: card.name, effect, trigger, en: englishFingerprint(effect, trigger) })
    }
    writeFileSync(`${out}/todo.json`, JSON.stringify([...todo.values()], null, 1))
    writeFileSync(`${out}/pairs.json`, JSON.stringify([...pairs.values()], null, 1))
    console.log('à traduire', todo.size, 'paires officielles', pairs.size)
  } finally { await db.$disconnect() }
}
void main()
