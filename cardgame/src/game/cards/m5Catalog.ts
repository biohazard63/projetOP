import data from './m5-reviewed-cards.json'
import type { CardInput, CardReview } from './types'

// M5-5 — catalogue extension from the official card lists (see the data file for the method). Only cards
// with no ability or exactly [Blocker] are included: both are executed by existing generic engine rules, so
// no card-specific logic and no invented effect. Recognised here does NOT mean certified (certification.ts).
export const M5_REVISION = 'm5-2026-10-12'
const BLOCKER_TEXT = '[Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)'
type Row = (typeof data.cards)[number]
function review(row: Row): CardReview {
  const blocker = row.kind === 'blocker'
  return {
    revision: M5_REVISION, faqChecked: true, errataChecked: true, playabilityStatus: 'DATA_VALID_EFFECT_PENDING',
    effects: blocker ? [{ kind: 'blocker', timing: 'BLOCK', cost: 'REST_SELF', target: 'SELF' }] : [],
    effectOriginal: blocker ? BLOCKER_TEXT : '', effectFr: '', translationStatus: 'non_official_review_required', triggerOriginal: '', triggerFr: '',
    requiredCapabilities: blocker ? ['blocker'] : [],
    references: [
      { source: `${data.sources.cardList}${row.series}`, checkedAt: data.checkedAt, language: 'en', detail: `${row.number}: characteristics, ${blocker ? 'exact [Blocker] text' : 'Effect "-"'}, no [Trigger]` },
      { source: data.sources.faqIndex, checkedAt: data.checkedAt, language: 'en', detail: `${row.number} appears in none of the official FAQ PDFs` },
      { source: data.sources.errata, checkedAt: data.checkedAt, language: 'en', detail: `No errata entry for ${row.number}` },
    ],
  }
}
export const M5_CARDS: CardInput[] = data.cards.map(row => ({
  number: row.number, printingKey: `${row.number}::standard`, databaseIds: [], nameFr: row.name, rulesName: row.name, category: row.category, colors: row.colors,
  attributes: row.attribute ? [row.attribute] : [], traits: row.traits, cost: row.cost, power: row.power, counter: row.counter, life: null, block: row.block,
  extensions: [], review: review(row),
}))
