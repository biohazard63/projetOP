import { REVIEWED_CARDS, type ReviewedFacts } from './reviewedCards'
import type { CardInput, CardReview } from './types'
import type { EffectDefinition, EffectRegistry } from '../effects/contracts'

const revision = 'm15c-2026-10-11'
const references: CardReview['references'] = [
  { source: 'https://en.onepiece-cardgame.com/cardlist/?series=569001', checkedAt: '2026-10-11', language: 'en', detail: 'Current characteristics and effect clauses consulted' },
  { source: 'https://en.onepiece-cardgame.com/pdf/qa_st-01-st-04.pdf?20240405=', checkedAt: '2026-10-11', language: 'en', detail: 'Luffy: only cost-area rested DON; Nami self-target; Brook one recipient; Zoro both turns; Sunny rest on play turn' },
  { source: 'https://en.onepiece-cardgame.com/rules/errata_card/', checkedAt: '2026-10-11', language: 'en', detail: 'Current errata and card-list wording consulted; up-to selections preserved' },
]
const binding = (number: string) => `${number}@${revision}`
function attachment(number: string, zone: 'leader' | 'characters', amount: number, timing: 'MAIN' | 'ON_PLAY'): EffectDefinition {
  return { id: `${number}.attach`, revision, dslVersion: '1.1.0', source: { kind: 'CARD_DEFINITION', definitionId: binding(number), zone }, timing,
    condition: { kind: 'ALWAYS' }, cost: { kind: 'NONE' }, usage: { kind: timing === 'MAIN' ? 'ONCE_PER_TURN' : 'UNLIMITED' }, program: [
      { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'OWN_RESTED_DON' }, min: 0, max: amount, optional: true, bind: 'dons', visibility: 'PUBLIC' },
      { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'OWN_FIELD' }, min: 1, max: 1, optional: false, bind: 'target', visibility: 'PUBLIC', whenBindingNonempty: 'dons' },
      { kind: 'OPERATION', operation: { primitive: 'attachRestedDon', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: 'dons', targetBinding: 'target' } },
    ] }
}
export const PROTOTYPE_REGISTRY: EffectRegistry = { version: '1.1.0', dslVersion: '1.1.0', restrictions: [], replacements: [], definitions: [
  attachment('ST01-001', 'leader', 1, 'MAIN'), attachment('ST01-007', 'characters', 1, 'MAIN'), attachment('ST01-011', 'characters', 2, 'ON_PLAY'),
  { id: 'ST01-017.boost', revision, dslVersion: '1.1.0', source: { kind: 'CARD_DEFINITION', definitionId: binding('ST01-017'), zone: 'stage' }, timing: 'MAIN',
    condition: { kind: 'ALWAYS' }, cost: { kind: 'REST_SOURCE' }, usage: { kind: 'UNLIMITED' }, program: [
      { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'OWN_FIELD', trait: 'Straw Hat Crew' }, min: 0, max: 1, optional: true, bind: 'target', visibility: 'PUBLIC' },
      { kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: 'target', amount: 1000, duration: 'THIS_TURN' } },
    ] },
  { id: 'OP06-007.ko', revision, dslVersion: '1.1.0', source: { kind: 'CARD_DEFINITION', definitionId: binding('OP06-007'), zone: 'characters' }, timing: 'ON_PLAY', condition: { kind: 'ALWAYS' }, cost: { kind: 'NONE' }, usage: { kind: 'UNLIMITED' }, program: [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'OPPONENT_CHARACTER', maximumPower: 10000 }, min: 0, max: 1, optional: true, bind: 'target', visibility: 'PUBLIC' },
    { kind: 'OPERATION', operation: { primitive: 'koCharacter', version: '1.0.0', player: 'OPPONENT', audience: 'PUBLIC', subjectBinding: 'target' } },
  ] },
], cardReplacements: [{ id: 'EB01-008.protect', definitionId: binding('EB01-008'), zone: 'characters', match: 'SELF_KO_BY_EFFECT', action: 'TRASH_HAND_INSTEAD', categories: ['EVENT', 'STAGE'], usage: 'ONCE_PER_TURN' }], continuous: [{ id: 'ST01-013.bonus', definitionId: binding('ST01-013'), zone: 'characters', characteristic: 'POWER', amount: 1000, minimumAttachedDon: 1 }] }

// Standalone reviewed laboratory definitions. Existing M0 revisions and player catalogue are untouched.
export function prototypeCards(): CardInput[] {
  const newFacts: Record<string, ReviewedFacts> = {
    'ST01-001': structuredClone(REVIEWED_CARDS['ST01-001']),
    'ST01-007': structuredClone(REVIEWED_CARDS['ST01-007']),
    'ST01-011': { ...structuredClone(REVIEWED_CARDS['ST01-007']), nameFr: 'Brook', rulesName: 'Brook', attributes: ['SLASH'], cost: 2, power: 3000, counter: 2000 },
    'ST01-013': { ...structuredClone(REVIEWED_CARDS['ST01-007']), nameFr: 'Roronoa Zoro', rulesName: 'Roronoa Zoro', attributes: ['SLASH'], traits: ['Supernovas', 'Straw Hat Crew'], cost: 3, power: 5000, counter: null },
    'EB01-008': { ...structuredClone(REVIEWED_CARDS['ST01-007']), nameFr: 'LittleOars Jr.', rulesName: 'LittleOars Jr.', attributes: ['STRIKE'], traits: ['Giant', 'Whitebeard Pirates Allies'], cost: 6, power: 7000, counter: 1000, block: '2' },
    'OP06-007': { ...structuredClone(REVIEWED_CARDS['ST01-007']), nameFr: 'Shanks', rulesName: 'Shanks', attributes: ['SLASH'], traits: ['FILM', 'The Four Emperors', 'Red-Haired Pirates'], cost: 10, power: 12000, counter: null, block: '2' },
    'ST01-017': { ...structuredClone(REVIEWED_CARDS['ST01-007']), nameFr: 'Thousand Sunny', rulesName: 'Thousand Sunny', category: 'STAGE', attributes: [], cost: 2, power: null, counter: null },
  }
  const descriptions: Record<string, string> = {
    'ST01-001': 'Activation principale, une fois par tour : attribuer zéro ou un DON épuisé du coût à son Leader ou un de ses Personnages.',
    'ST01-007': 'Activation principale, une fois par tour : attribuer zéro ou un DON épuisé du coût à son Leader ou un de ses Personnages, y compris cette Nami.',
    'ST01-011': 'En jouant : attribuer zéro à deux DON épuisés à un unique destinataire, Leader ou Personnage propre.',
    'ST01-013': 'Si au moins un DON est attaché : bonus de puissance de 1000 sur les deux tours.',
    'EB01-008': 'Une fois par tour, remplacer son KO par effet en défaussant un Événement ou Lieu de sa main ; choix facultatif.',
    'OP06-007': 'En jouant, mettre KO zéro ou un Personnage adverse de puissance actuelle au plus 10000.',
    'ST01-017': 'Activation principale : épuiser ce Lieu comme coût ; zéro ou une carte Leader ou Personnage propre de type Straw Hat Crew reçoit un bonus de puissance de 1000 pendant ce tour.',
  }
  const originalTexts: Record<string, string> = {"ST01-001": "[Activate: Main] [Once Per Turn] Give this Leader or 1 of your Characters up to 1 rested DON!! card.", "ST01-007": "[Activate: Main] [Once Per Turn] Give up to 1 rested DON!! card to your Leader or 1 of your Characters.", "ST01-011": "[On Play] Give up to 2 rested DON!! cards to your Leader or 1 of your Characters.", "ST01-013": "[DON!! x1] This Character gains +1000 power.", "ST01-017": "[Activate: Main] You may rest this Stage: Up to 1 {Straw Hat Crew} type Leader or Character card on your field gains +1000 power during this turn."}
  originalTexts["EB01-008"] = "[Once Per Turn] If this Character would be K.O.'d by an effect, you may trash 1 Event or Stage card from your hand instead."
  originalTexts["OP06-007"] = "[On Play] K.O. up to 1 of your opponent's Characters with 10000 power or less."
  return Object.entries(newFacts).map(([number, facts]) => {
    const abilityIds = [...PROTOTYPE_REGISTRY.definitions.filter(d => d.source.kind === 'CARD_DEFINITION' && d.source.definitionId === binding(number)).map(d => d.id),
      ...(PROTOTYPE_REGISTRY.cardReplacements ?? []).filter(d => d.definitionId === binding(number)).map(d => d.id),
      ...(PROTOTYPE_REGISTRY.continuous ?? []).filter(d => d.definitionId === binding(number)).map(d => d.id)]
    return { ...facts, number, printingKey: `${number}::standard`, databaseIds: [], extensions: [number.startsWith('EB') ? 'EB-01' : number.startsWith('OP') ? 'OP-06' : 'ST-01'], life: facts.category === 'LEADER' ? 5 : null,
      lifeEvidence: facts.category === 'LEADER' ? [{ field: 'life' as const, value: 5, source: references[0].source, checkedAt: '2026-10-11', language: 'en' as const }] : [],
      review: { revision, references: number.startsWith('ST') ? structuredClone(references) : [
        { source: `https://en.onepiece-cardgame.com/cardlist/?series=${number.startsWith('EB') ? '569201' : '569106'}`, checkedAt: '2026-10-11', language: 'en', detail: 'Current card text and characteristics consulted' },
        { source: `https://en.onepiece-cardgame.com/pdf/qa_${number.startsWith('EB') ? 'eb01' : 'op06'}.pdf?20240419=`, checkedAt: '2026-10-11', language: 'en', detail: 'EB01-008 no replacement without Event/Stage; no individual Shanks entry' },
        references[2],
      ], faqChecked: true, errataChecked: true, effects: [{ kind: 'declarative' as const, abilityIds }],
        effectOriginal: originalTexts[number], effectFr: descriptions[number], translationStatus: 'non_official_review_required' as const, triggerOriginal: '', triggerFr: '', requiredCapabilities: ['declarative'] } }
  })
}
