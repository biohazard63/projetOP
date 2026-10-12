import type { CardDefinition, SourceReference } from './types'
import type { EffectRegistry } from '../effects/contracts'
import { M5_CARDS, M5_REVISION } from './m5Catalog'

// M4-C1 — certification per definition revision. A certification is a separate, explicit record bound to
// one definitionId (number@revision); it is never carried by `review.playabilityStatus`, never inherited by
// a clone and never granted to a whole deck. The historic `playabilityStatus` field stays as laboratory
// metadata and cannot by itself make a card PLAYABLE_VERIFIED.
export type CertifiedAbility = { kind: 'blocker' | 'declarative' | 'giveRestedDon' | 'counterEvent' | 'trigger'; id: string; tests: string[] }
export type Certification = {
  definitionId: string
  certifiedAt: string
  rulesVersion: '1.2.1'
  rulesetId: string
  // Each check is a source re-read on `checkedAt` for this exact revision.
  cardText: SourceReference
  faq: SourceReference
  errata: SourceReference
  abilities: CertifiedAbility[]
  // Real-engine tests (exact node:test titles) that execute this card in a game.
  tests: string[]
  notes: string
}
export type CertificationBlocker = { definitionId: string; reason: 'DATA_CONFLICT' | 'ABILITY_NOT_CERTIFIED' | 'NOT_REVIEWED'; detail: string; checkedAt: string }

const today = '2026-10-12'
const cardList = (series: string, detail: string): SourceReference => ({ source: `https://en.onepiece-cardgame.com/cardlist/?series=${series}`, checkedAt: today, language: 'en', detail })
const faq = (pdf: string, detail: string): SourceReference => ({ source: `https://en.onepiece-cardgame.com/pdf/${pdf}`, checkedAt: today, language: 'en', detail })
const errata = (detail: string): SourceReference => ({ source: 'https://en.onepiece-cardgame.com/rules/errata_card/', checkedAt: today, language: 'en', detail })
const series: Record<string, string> = { ST01: '569001', ST04: '569004', OP01: '569101', OP02: '569102', OP04: '569104', P: '569901' }
const faqPdf: Record<string, string> = { ST01: 'qa_st-01-st-04.pdf?20240405=', ST04: 'qa_st-01-st-04.pdf?20240405=', OP01: 'qa_op01.pdf?20240405=', OP02: 'qa_op02.pdf?20240405=', OP04: 'qa_op04.pdf?20240405=', P: 'qa_promotion-cards.pdf?20260206=' }
const setOf = (number: string) => number.startsWith('P-') ? 'P' : number.slice(0, 4)

export const CERTIFIED_PLAY_TEST = 'M4-C2: every certified character is played for its printed cost, battles with its printed power and counters with its printed value'
export const CERTIFIED_DECK_TEST = 'M3-3: the purple deck satisfies every construction rule in playable mode and wrong variants are refused'
export const FULL_GAME_TEST = 'M3-5: the reference game reaches a regulatory victory through real commands'
export const BLOCKER_TEST = 'M4-C2: certified [Blocker] characters redirect a real attack by resting themselves'
export const M5_CERTIFIED_TEST = 'M5-5: every certified M5 Character is played in a legal deck for its cost, keeps its power and defends with its Counter or [Blocker]'

function vanilla(number: string, revision: string): Certification {
  const set = setOf(number)
  return {
    definitionId: `${number}@${revision}`, certifiedAt: today, rulesVersion: '1.2.1', rulesetId: 'm3-reviewed-subset-2026-10-12',
    cardText: cardList(series[set], `${number}: name, category, cost, power, counter, colour, attribute, types and block equal the engine definition; Effect "-" and no [Trigger]`),
    faq: faq(faqPdf[set], `No individual entry for ${number}`), errata: errata(`No errata entry for ${number}`),
    abilities: [], tests: [CERTIFIED_PLAY_TEST], notes: 'Card without ability: certification covers its printed characteristics in play, battle and Counter step.',
  }
}
function blocker(number: string, revision: string): Certification {
  return { ...vanilla(number, revision),
    cardText: cardList(series[setOf(number)], `${number}: characteristics equal the engine definition; text is exactly [Blocker] with its reminder; no [Trigger]`),
    abilities: [{ kind: 'blocker', id: 'blocker', tests: [BLOCKER_TEST] }], tests: [CERTIFIED_PLAY_TEST, BLOCKER_TEST],
    notes: '[Blocker] (CR 1.2.1 §10-1-4): rest this card after an attack is declared to become the new target.' }
}
// C2 — the cards whose regulatory evidence is complete on 2026-10-12 (automatic field comparison against the
// official card list, FAQ and errata re-read, executed in real-engine tests).
export const CERTIFICATIONS: Certification[] = [
  ...['ST01-003', 'ST01-008', 'ST01-009', 'ST01-010', 'OP01-010', 'OP01-012', 'OP01-018', 'OP01-023', 'P-012', 'P-016'].map(n => vanilla(n, 'm0-2026-10-10')),
  blocker('ST01-006', 'm0-2026-10-10'),
  ...['ST04-007', 'ST04-009', 'ST04-012', 'ST04-013', 'OP01-092', 'OP01-103', 'OP01-107', 'OP01-110', 'OP02-077', 'OP02-080', 'OP04-062'].map(n => vanilla(n, 'm3-2026-10-12')),
  blocker('ST04-011', 'm3-2026-10-12'),
]
// M5 batch: single-colour red or purple M5 Characters (the colours of the executable Leaders), each played in
// a real legal game by M5_CERTIFIED_TEST. Other M5 cards are recognised by the engine but not certified.
export const M5_CERTIFIABLE = M5_CARDS.filter(c => Array.isArray(c.colors) && c.colors.length === 1 && ['RED', 'PURPLE'].includes(c.colors[0]))
CERTIFICATIONS.push(...M5_CERTIFIABLE.map(card => {
  const blocker = card.review!.effects.length > 0, number = card.number
  return { definitionId: `${number}@${M5_REVISION}`, certifiedAt: today, rulesVersion: '1.2.1' as const, rulesetId: 'm5-reviewed-subset-2026-10-12',
    cardText: { ...card.review!.references[0], detail: `${number}: characteristics equal the engine definition; ${blocker ? 'exact [Blocker] text' : 'Effect "-"'}; no [Trigger]` },
    faq: { ...card.review!.references[1] }, errata: { ...card.review!.references[2] },
    abilities: blocker ? [{ kind: 'blocker' as const, id: 'blocker', tests: [M5_CERTIFIED_TEST] }] : [], tests: [M5_CERTIFIED_TEST],
    notes: 'M5 batch: data extracted from the official card list; executed through the generic Character and [Blocker] rules.' }
}))
export const CERTIFICATION_BLOCKERS: CertificationBlocker[] = [
  { definitionId: 'P-015@m0-2026-10-10', reason: 'DATA_CONFLICT', checkedAt: today, detail: 'Official card list gives attribute Wisdom; the m0 revision says STRIKE. A corrected revision is required before certification.' },
]

export function certificationOf(definitionId: string): Certification | undefined {
  return CERTIFICATIONS.find(c => c.definitionId === definitionId)
}
/** The only source of PLAYABLE_VERIFIED: an explicit certification of this exact revision. */
export function effectiveStatus(definition: CardDefinition): NonNullable<CardDefinition['review']['playabilityStatus']> {
  if (certificationOf(definition.definitionId)) return 'PLAYABLE_VERIFIED'
  const status = definition.review.playabilityStatus ?? 'DATA_VALID_EFFECT_PENDING'
  return status === 'PLAYABLE_VERIFIED' ? 'DATA_VALID_EFFECT_PENDING' : status
}
/** Structural checks binding a certification to its definition and to executable programs. */
export function certificationErrors(c: Certification, definition: CardDefinition | undefined, registry: EffectRegistry): string[] {
  const errors: string[] = []
  if (!definition) return ['UNKNOWN_DEFINITION']
  if (definition.definitionId !== c.definitionId || `${definition.number}@${definition.revision}` !== c.definitionId) errors.push('REVISION_MISMATCH')
  if (!definition.review.faqChecked || !definition.review.errataChecked) errors.push('REVIEW_INCOMPLETE')
  if (CERTIFICATION_BLOCKERS.some(b => b.definitionId === c.definitionId)) errors.push('BLOCKED')
  if (![c.cardText, c.faq, c.errata].every(r => r.checkedAt === c.certifiedAt && /^https:\/\/en\.onepiece-cardgame\.com\//.test(r.source))) errors.push('SOURCE_NOT_RECHECKED')
  if (!c.tests.length || c.abilities.some(a => !a.tests.length)) errors.push('MISSING_TESTS')
  const kinds = definition.review.effects.map(e => e.kind).sort()
  if (JSON.stringify(kinds) !== JSON.stringify(c.abilities.map(a => a.kind).sort())) errors.push('ABILITY_SET_MISMATCH')
  if (definition.review.triggerOriginal.trim() || definition.review.counterEvent) errors.push('UNCERTIFIED_CAPABILITY')
  if (!kinds.length && (definition.review.effectOriginal.trim() || definition.review.effectFr.trim())) errors.push('TEXT_WITHOUT_ABILITY')
  for (const e of definition.review.effects) if (e.kind === 'declarative' && e.abilityIds.some(id => !registry.definitions.some(d => d.id === id && d.source.kind === 'CARD_DEFINITION' && d.source.definitionId === definition.definitionId))) errors.push('ABILITY_NOT_EXECUTABLE')
  return errors
}
