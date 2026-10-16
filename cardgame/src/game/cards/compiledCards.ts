import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { OFFICIAL_EN_ROWS } from './officialRows'
import { officialCard, officialDefinitionId, officialRow } from './officialCards'
import { compileCardText, type AttackProhibition, type CompiledCard, type ConditionalKeyword, type Continuous } from './textCompiler'

// M7 — cards whose whole official English text is recognised by the text compiler (textCompiler.ts), one pack per official card
// list snapshot. A number already defined by a hand-written pack is never compiled again (the manual review wins), and a card
// with any unrecognised word is left out. Being compiled does not make a card playable: only a certification does.
// Latest series first: a number printed again in an older set keeps the text of its latest snapshot.
export const COMPILED_LABELS = ['OP-17', 'OP-16', 'OP15-EB04', 'OP14-EB04', 'OP-13', 'OP-12', 'OP-11', 'OP-10', 'OP-09', 'OP-08', 'OP-07', 'OP-06', 'OP-05', 'OP-04', 'OP-03', 'OP-02', 'OP-01', 'EB-03', 'EB-02', 'EB-01', 'PRB-02', 'PRB-01'] as const
export type CompiledPack = { label: string; cards: CardInput[]; definitions: EffectDefinition[]; continuous: Continuous[]; conditionalKeywords: ConditionalKeyword[]; attackProhibitions: AttackProhibition[]; compiled: CompiledCard[] }
const numberOf = (code: string) => code.replace(/(?:_[pr]\d+)+$/i, '').toUpperCase()

export function compiledPack(label: string, alreadyDefined: ReadonlySet<string>): CompiledPack {
  const pack: CompiledPack = { label, cards: [], definitions: [], continuous: [], conditionalKeywords: [], attackProhibitions: [], compiled: [] }
  const numbers = [...new Set((OFFICIAL_EN_ROWS[label] ?? []).map(r => numberOf(r.code)))].sort()
  for (const number of numbers) {
    if (alreadyDefined.has(number)) continue
    const row = officialRow(label, number)
    // A row whose printed cost is missing from the snapshot ("-") is left out, never completed by guess.
    if (!/^\d+$/.test(String(row.cost ?? '').trim())) continue
    const c = compileCardText(row, officialDefinitionId(number))
    if (c.unparsed.length) continue
    pack.compiled.push(c)
    pack.cards.push(officialCard(label, number, c.profile))
    pack.definitions.push(...c.abilities); pack.continuous.push(...c.continuous); pack.conditionalKeywords.push(...c.conditionalKeywords); pack.attackProhibitions.push(...c.attackProhibitions)
  }
  return pack
}
