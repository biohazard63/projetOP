import type { CardCategory, CardReview } from './types'
const catalog = 'https://en.onepiece-cardgame.com/cardlist/?series=569001'
const faq = 'https://en.onepiece-cardgame.com/pdf/qa_st-01-st-04.pdf?20240405='
const errata = 'https://en.onepiece-cardgame.com/rules/errata_card/'
const references = [
  { source: catalog, checkedAt: '2026-10-10', language: 'en' as const, detail: 'ST-01: printed characteristics and current text' },
  { source: faq, checkedAt: '2026-10-10', language: 'en' as const, detail: 'ST01-001: attached DON excluded; ST01-007: self is eligible; no individual entry for reviewed vanilla cards' },
  { source: errata, checkedAt: '2026-10-10', language: 'en' as const, detail: '2022-09-26: up to one on ST01-001 and ST01-007' },
]
const give: CardReview['effects'] = [{ kind: 'giveRestedDon', timing: 'ACTIVATE_MAIN', oncePerTurn: true, amount: { min: 0, max: 1 }, from: 'OWN_COST_RESTED', target: 'OWN_LEADER_OR_CHARACTER' }]
function review(effects: CardReview['effects'], original: string, fr: string): CardReview {
  return { revision: 'm0-2026-10-10', references, faqChecked: true, errataChecked: true, effects, effectOriginal: original, effectFr: fr, translationStatus: 'non_official_review_required', triggerOriginal: '', triggerFr: '', requiredCapabilities: effects.map(e => e.kind) }
}
export type ReviewedFacts = { nameFr: string; rulesName: string; category: CardCategory; colors: string[]; attributes: string[]; traits: string[]; cost: number | null; power: number | null; counter: number | null; block: string; review: CardReview }
// Texts reused from local archives and checked against Bandai, not a new card scrape.
// FR wording remains a non-official translation; executable semantics are specified separately.
export const REVIEWED_CARDS: Record<string, ReviewedFacts> = {
  'ST01-001': { nameFr: 'Monkey D. Luffy', rulesName: 'Monkey.D.Luffy', category: 'LEADER', colors: ['RED'], attributes: ['STRIKE'], traits: ['Supernovas', 'Straw Hat Crew'], cost: null, power: 5000, counter: null, block: '1', review: review(give, '[Activate: Main] [Once Per Turn] Give this Leader or 1 of your Characters up to 1 rested DON!! card.', '[Activation : Principale] [Une fois par tour] Donnez jusqu’à 1 DON!! épuisé à ce Leader ou à 1 de vos Personnages.') },
  'ST01-003': { nameFr: 'Karoo', rulesName: 'Karoo', category: 'CHARACTER', colors: ['RED'], attributes: ['STRIKE'], traits: ['Animal', 'Alabasta'], cost: 1, power: 3000, counter: 1000, block: '1', review: review([], '', '') },
  'ST01-006': { nameFr: 'Tony-Tony Chopper', rulesName: 'Tony Tony.Chopper', category: 'CHARACTER', colors: ['RED'], attributes: ['STRIKE'], traits: ['Animal', 'Straw Hat Crew'], cost: 1, power: 1000, counter: null, block: '1', review: review([{ kind: 'blocker', timing: 'BLOCK', cost: 'REST_SELF', target: 'SELF' }], '[Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)', '[Bloqueur] Après la déclaration d’une attaque adverse, vous pouvez épuiser ce Personnage pour en faire la nouvelle cible, pendant l’étape de Blocage.') },
  'ST01-007': { nameFr: 'Nami', rulesName: 'Nami', category: 'CHARACTER', colors: ['RED'], attributes: ['SPECIAL'], traits: ['Straw Hat Crew'], cost: 1, power: 1000, counter: 1000, block: '1', review: review(give, '[Activate: Main] [Once Per Turn] Give up to 1 rested DON!! card to your Leader or 1 of your Characters.', '[Activation : Principale] [Une fois par tour] Donnez jusqu’à 1 DON!! épuisé à votre Leader ou à 1 de vos Personnages.') },
  'ST01-008': { nameFr: 'Nico Robin', rulesName: 'Nico Robin', category: 'CHARACTER', colors: ['RED'], attributes: ['WISDOM'], traits: ['Straw Hat Crew'], cost: 3, power: 5000, counter: 1000, block: '1', review: review([], '', '') },
  'ST01-009': { nameFr: 'Nefeltari Vivi', rulesName: 'Nefeltari Vivi', category: 'CHARACTER', colors: ['RED'], attributes: ['SLASH'], traits: ['Alabasta'], cost: 2, power: 4000, counter: 1000, block: '1', review: review([], '', '') },
}

const vanillaCards = [
  ['ST01-010', 'Franky', 4, 6000, 'STRIKE', ['Straw Hat Crew']],
  ['OP01-010', 'Komachiyo', 1, 3000, 'STRIKE', ['Animal', 'Land of Wano']],
  ['OP01-012', 'Sai', 2, 4000, 'SLASH', ['Happosui Army']],
  ['OP01-018', 'Hajrudin', 4, 6000, 'STRIKE', ['Giant', 'New Giant Pirates']],
  ['OP01-023', 'Marco', 3, 5000, 'SPECIAL', ['Former Whitebeard Pirates']],
  ['P-012', 'Jellyfish Pirates', 3, 5000, 'SPECIAL', ['FILM', 'Jellyfish Pirates']],
  ['P-015', 'Sunny-Kun', 1, 3000, 'STRIKE', ['FILM', 'Straw Hat Crew']],
  ['P-016', 'Shanks', 8, 10000, 'SLASH', ['FILM', 'The Four Emperors', 'Red-Haired Pirates']],
] as const
for (const [number, name, cost, power, attribute, traits] of vanillaCards) {
  const series = number.startsWith('OP01') ? '569101' : number.startsWith('P-') ? '569901' : '569001'
  const faqSource = number.startsWith('OP01') ? 'https://en.onepiece-cardgame.com/pdf/qa_op01.pdf?20240405=' : number.startsWith('P-') ? 'https://en.onepiece-cardgame.com/pdf/qa_promotion-cards.pdf?20260206=' : faq
  const cardReview = review([], '', '')
  cardReview.references = [
    { source: `https://en.onepiece-cardgame.com/cardlist/?series=${series}`, checkedAt: '2026-10-10', language: 'en', detail: `${number}: characteristics, no effect and no Trigger verified` },
    { source: faqSource, checkedAt: '2026-10-10', language: 'en', detail: 'FAQ consulted; no individual entry for this vanilla card' },
    { source: errata, checkedAt: '2026-10-10', language: 'en', detail: 'No applicable entry found for the selected card' },
  ]
  REVIEWED_CARDS[number] = { nameFr: number === 'P-012' ? 'Équipage des Méduses' : name, rulesName: name, category: 'CHARACTER', colors: ['RED'], attributes: [attribute], traits: [...traits], cost, power, counter: 1000, block: '1', review: cardReview }
}
