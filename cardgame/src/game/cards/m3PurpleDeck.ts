import type { CardInput, CardReview } from './types'
import type { EffectDefinition, EffectRegistry } from '../effects/contracts'
import { M3_ABILITY_CARDS, M3_ABILITY_REGISTRY } from './m3Abilities'

// M3-3 reference purple deck: Leader ST04-001 Kaido, 50 purple cards whose every printed ability is executable.
// Every characteristic below was read on en.onepiece-cardgame.com card lists on 2026-10-12; the FAQ PDFs
// (ST-01..04, OP-01, OP-02, OP-04) and the errata page were checked the same day. No card is certified here.
const checkedAt = '2026-10-12'
const revision = 'm3-2026-10-12'
const cardList = (series: string) => `https://en.onepiece-cardgame.com/cardlist/?series=${series}`
const errata = 'https://en.onepiece-cardgame.com/rules/errata_card/'
const faqs: Record<string, string> = {
  ST04: 'https://en.onepiece-cardgame.com/pdf/qa_st-01-st-04.pdf?20240405=',
  OP01: 'https://en.onepiece-cardgame.com/pdf/qa_op01.pdf?20240405=',
  OP02: 'https://en.onepiece-cardgame.com/pdf/qa_op02.pdf?20240405=',
  OP04: 'https://en.onepiece-cardgame.com/pdf/qa_op04.pdf?20240405=',
}
const seriesOf: Record<string, string> = { ST04: '569004', OP01: '569101', OP02: '569102', OP04: '569104' }
export const KAIDO_ABILITY_ID = 'ST04-001.activate-main-trash-top-life'

function review(number: string, effects: CardReview['effects'], effectOriginal: string, faqDetail: string, errataDetail: string): CardReview {
  const set = number.slice(0, 4)
  return {
    revision, faqChecked: true, errataChecked: true, playabilityStatus: 'DATA_VALID_EFFECT_PENDING', effects, effectOriginal,
    effectFr: '', translationStatus: 'non_official_review_required', triggerOriginal: '', triggerFr: '', requiredCapabilities: effects.map(e => e.kind),
    references: [
      { source: cardList(seriesOf[set]), checkedAt, language: 'en', detail: `${number}: printed characteristics, card text and absence of [Trigger]` },
      { source: faqs[set], checkedAt, language: 'en', detail: faqDetail },
      { source: errata, checkedAt, language: 'en', detail: errataDetail },
    ],
  }
}
type Character = [number: string, name: string, cost: number, power: number, attribute: string, traits: string[]]
const vanilla: Character[] = [
  ['ST04-009', 'Ginrummy', 1, 3000, 'STRIKE', ['Animal Kingdom Pirates', 'Smile']],
  ['ST04-007', 'Sheepshead', 2, 4000, 'SLASH', ['Animal Kingdom Pirates', 'Smile']],
  ['OP02-080', 'Dobon', 2, 4000, 'STRIKE', ['Animal Kingdom Pirates', 'SMILE']],
  ['ST04-013', 'X.Drake', 3, 5000, 'SLASH', ['Navy', 'Drake Pirates', 'Animal Kingdom Pirates']],
  ['OP02-077', 'Solitaire', 3, 5000, 'SLASH', ['Animal Kingdom Pirates', 'SMILE']],
  ['ST04-012', 'Page One', 4, 6000, 'STRIKE', ['Animal Kingdom Pirates']],
  ['OP01-103', 'Scratchmen Apoo', 4, 6000, 'RANGED', ['Animal Kingdom Pirates', 'On-Air Pirates']],
  ['OP01-107', 'Babanuki', 5, 7000, 'RANGED', ['Animal Kingdom Pirates', 'SMILE']],
  ['OP04-062', 'Bananagator', 5, 7000, 'STRIKE', ['Animal']],
  ['OP01-110', 'Fukurokuju', 6, 8000, 'SPECIAL', ['Land of Wano', 'Animal Kingdom Pirates']],
  ['OP01-092', 'Urashima', 7, 9000, 'STRIKE', ['Land of Wano']],
]
const character = ([number, name, cost, power, attribute, traits]: Character, effects: CardReview['effects'] = [], text = ''): CardInput => ({
  number, printingKey: `${number}::standard`, databaseIds: [], nameFr: name, rulesName: name, category: 'CHARACTER', colors: ['PURPLE'], attributes: [attribute], traits,
  cost, power, counter: 1000, life: null, block: '1', extensions: [`${number.slice(0, 2)}-${number.slice(2, 4)}`],
  review: review(number, effects, text, `FAQ ${number.slice(0, 4)} consulted; no individual entry for ${number}`, `No errata entry for ${number}`),
})
export const KAIDO_LEADER: CardInput = {
  number: 'ST04-001', printingKey: 'ST04-001::standard', databaseIds: [], nameFr: 'Kaido', rulesName: 'Kaido', category: 'LEADER', colors: ['PURPLE'], attributes: ['STRIKE'],
  traits: ['The Four Emperors', 'Animal Kingdom Pirates'], cost: null, power: 5000, counter: null, life: 5, block: '1', extensions: ['ST-04'],
  lifeEvidence: [{ field: 'life', value: 5, source: cardList('569004'), checkedAt, language: 'en' }],
  review: review('ST04-001', [{ kind: 'declarative', abilityIds: [KAIDO_ABILITY_ID] }],
    '[Activate: Main] [Once Per Turn] DON!! −7 (You may return the specified number of DON!! cards from your field to your DON!! deck.): Trash up to 1 of your opponent\'s cards from the top of their Life cards.',
    'FAQ ST04-001: the effect can be activated when the opponent has no Life cards, but nothing happens; it cannot win the game',
    'Errata 2022-09-26 / rule revision 2022-09-30: "Trash up to 1 of your opponent\'s cards from the top of their Life cards" (card list wording: "Trash up to 1 of your opponent\'s Life cards")'),
}
export const PURPLE_CARDS: CardInput[] = [
  KAIDO_LEADER,
  ...vanilla.map(card => character(card)),
  character(['ST04-011', 'Black Maria', 2, 2000, 'SPECIAL', ['Animal Kingdom Pirates']], [{ kind: 'blocker', timing: 'BLOCK', cost: 'REST_SELF', target: 'SELF' }],
    '[Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)'),
  structuredClone(M3_ABILITY_CARDS.find(card => card.number === 'ST04-016')!),
]
// 11 vanilla x4 except Urashima x2 (42), Black Maria x4, Blast Breath x4: 50 cards, all purple.
export const PURPLE_DECK = [
  { printingKey: 'ST04-001::standard', quantity: 1 },
  ...vanilla.map(([number]) => ({ printingKey: `${number}::standard`, quantity: number === 'OP01-092' ? 2 : 4 })),
  { printingKey: 'ST04-011::standard', quantity: 4 },
  { printingKey: 'ST04-016::standard', quantity: 4 },
]
const kaido: EffectDefinition = {
  id: KAIDO_ABILITY_ID, revision: '1', dslVersion: '1.3.0', source: { kind: 'CARD_DEFINITION', definitionId: `ST04-001@${revision}`, zone: 'leader' },
  timing: 'ACTIVATE_MAIN', condition: { kind: 'ALWAYS' }, cost: { kind: 'DON_MINUS', amount: 7 }, usage: { kind: 'ONCE_PER_TURN' },
  program: [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'OPPONENT_TOP_LIFE' }, optional: true, min: 0, max: 1, bind: 'life', visibility: 'PUBLIC' },
    { kind: 'OPERATION', operation: { primitive: 'trashLife', version: '1.0.0', player: 'OPPONENT', audience: 'PUBLIC', subjectBinding: 'life' } },
  ],
}
export const M3_FULL_REGISTRY: EffectRegistry = { ...structuredClone(M3_ABILITY_REGISTRY), definitions: [...structuredClone(M3_ABILITY_REGISTRY.definitions), kaido] }
