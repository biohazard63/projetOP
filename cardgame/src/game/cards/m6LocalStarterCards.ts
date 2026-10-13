import st01Rows from '../../../carteJson/ST-01/cards-ST-01.json'
import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { playThisCardSteps } from './dsl'

const sourcePath = 'cardgame/carteJson/ST-01/cards-ST-01.json'
const revision = 'm6-cardjson-2026-10-13'
const abilityId = 'ST01-005.when-attacking'
const definitionId = `ST01-005@${revision}`
const categoryMap: Record<string, CardInput['category']> = { LEADER: 'LEADER', CHARACTER: 'CHARACTER', EVENT: 'EVENT', STAGE: 'STAGE' }
const colorMap: Record<string, string> = { RED: 'RED', ROUGE: 'RED', GREEN: 'GREEN', VERT: 'GREEN', BLUE: 'BLUE', BLEU: 'BLUE', PURPLE: 'PURPLE', VIOLET: 'PURPLE', BLACK: 'BLACK', NOIR: 'BLACK', YELLOW: 'YELLOW', JAUNE: 'YELLOW' }
const attributeMap: Record<string, string> = { STRIKE: 'STRIKE', FRAPPE: 'STRIKE', SLASH: 'SLASH', TRANCHE: 'SLASH', RANGED: 'RANGED', DISTANCE: 'RANGED', SPECIAL: 'SPECIAL', WISDOM: 'WISDOM', SAGESSE: 'WISDOM' }
function number(value: string | number): number | null {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 ? value : null
  if (!value.trim() || value === '-') return null
  const normalized = value.replaceAll(' ', '')
  return /^\d+$/.test(normalized) && Number.isSafeInteger(Number(normalized)) ? Number(normalized) : null
}
type LocalST01Number = 'ST01-002' | 'ST01-004' | 'ST01-005' | 'ST01-011' | 'ST01-012' | 'ST01-013' | 'ST01-015' | 'ST01-016' | 'ST01-017'
function localCard(number: LocalST01Number): CardInput {
  const raw = st01Rows.find(card => card.code === number)
  if (!raw) throw new Error(`LOCAL_CARD_MISSING:${number}`)
  const category = categoryMap[raw.type.trim().toUpperCase()]
  const sourceColor = colorMap[raw.color.trim().toUpperCase()]
  const sourceAttribute = attributeMap[raw.attribute.trim().toUpperCase()]
  if (!category || !sourceColor || (raw.attribute !== '-' && !sourceAttribute)) throw new Error(`INVALID_LOCAL_CARD_DATA:${number}`)
  const triggerAbilityId = number === 'ST01-016' ? 'ST01-016.trigger-ko-blocker' : `${abilityIdFor(number)}.trigger`
  const cardAbilityIds = [abilityIdFor(number), ...(number === 'ST01-015' || number === 'ST01-002' || number === 'ST01-016' ? [triggerAbilityId] : [])]
  return {
    number: raw.code, printingKey: `${raw.code}::standard`, databaseIds: [], nameFr: raw.name, rulesName: raw.name,
    category, colors: [sourceColor], attributes: sourceAttribute ? [sourceAttribute] : [], traits: raw.types.split('/').map(value => value.trim()).filter(Boolean),
    cost: numberValue(raw.cost), power: numberValue(raw.power), counter: numberValue(raw.counter), life: null, block: null, extensions: ['ST-01'],
  review: {
      // Characteristics/text come from the local cardJson row; its official card-list URL, the ST-01..04 FAQ and the
      // errata page were re-read on 2026-10-13 (archived under docs/game/evidence/m6/sources/). The local text equals
      // the post-errata (September 26, 2022 "up to") wording.
      revision, references: [
        { source: raw.url, checkedAt: '2026-10-13', language: 'en', detail: `Official card list row; local copy ${sourcePath}` },
        { source: 'https://en.onepiece-cardgame.com/pdf/qa_st-01-st-04.pdf?20240405', checkedAt: '2026-10-13', language: 'en', detail: `ST-01..04 FAQ entries for ${raw.code} reviewed` },
        { source: 'https://en.onepiece-cardgame.com/rules/errata_card/', checkedAt: '2026-10-13', language: 'en', detail: 'Errata page checked; local text matches the post-errata wording' },
      ],
      faqChecked: true, errataChecked: true, effects: [{ kind: 'declarative', abilityIds: cardAbilityIds }], effectOriginal: raw.effect,
      effectFr: '', translationStatus: 'non_official_review_required', triggerOriginal: raw.trigger, triggerFr: '', requiredCapabilities: ['declarative', ...(number === 'ST01-015' || number === 'ST01-002' || number === 'ST01-016' ? ['trigger'] : [])],
      playabilityStatus: 'DATA_VALID_EFFECT_PENDING',
      ...(number === 'ST01-012' ? { combatKeywords: ['RUSH' as const] } : {}),
    },
  }
}
function numberValue(value: string): number | null { return number(value) }
function abilityIdFor(number: string): string {
  const suffix: Record<LocalST01Number, string> = {
    'ST01-002': 'when-attacking-prevent-blocker', 'ST01-004': 'conditional-rush', 'ST01-005': 'when-attacking',
    'ST01-011': 'on-play-attach-rested-don', 'ST01-012': 'when-attacking-prevent-blocker', 'ST01-013': 'attached-don-power',
    'ST01-015': 'main-ko-character', 'ST01-016': 'main-prevent-blocker', 'ST01-017': 'activate-main-boost',
  }
  return `${number}.${suffix[number as LocalST01Number]}`
}

/** Direct projections of local cardJson rows; incomplete review remains explicitly non-playable. */
export const ST01_SANJI_LOCAL_CARD = localCard('ST01-004')
export const ST01_USOPP_LOCAL_CARD = localCard('ST01-002')
export const ST01_JINBE_LOCAL_CARD = localCard('ST01-005')
export const ST01_BROOK_LOCAL_CARD = localCard('ST01-011')
export const ST01_RUSH_LUFFY_LOCAL_CARD = localCard('ST01-012')
export const ST01_ZORO_LOCAL_CARD = localCard('ST01-013')
export const ST01_JET_PISTOL_LOCAL_CARD = localCard('ST01-015')
export const ST01_DIABLE_JAMBE_LOCAL_CARD = localCard('ST01-016')
export const ST01_SUNNY_LOCAL_CARD = localCard('ST01-017')
export const ST01_LOCAL_CARDS = [ST01_USOPP_LOCAL_CARD, ST01_SANJI_LOCAL_CARD, ST01_JINBE_LOCAL_CARD, ST01_BROOK_LOCAL_CARD, ST01_RUSH_LUFFY_LOCAL_CARD, ST01_ZORO_LOCAL_CARD, ST01_JET_PISTOL_LOCAL_CARD, ST01_DIABLE_JAMBE_LOCAL_CARD, ST01_SUNNY_LOCAL_CARD]

/** First local data-driven ST-01 ability profile. The runtime only sees generic DSL operations. */
export const ST01_JINBE_LOCAL_ABILITY: EffectDefinition = {
  id: abilityId, revision: '1', dslVersion: '1.3.0', source: { kind: 'CARD_DEFINITION', definitionId, zone: 'characters' },
  timing: 'WHEN_ATTACKING', condition: { kind: 'SOURCE_ATTACHED_DON_AT_LEAST', minimum: 1 }, cost: { kind: 'NONE' },
  usage: { kind: 'UNLIMITED' }, program: [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'OWN_LEADER_OR_CHARACTER', excludeSource: true }, optional: true, min: 0, max: 1, bind: 'target', visibility: 'PUBLIC' },
    { kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: 'target', amount: 1000, duration: 'THIS_TURN' } },
  ],
}

const attachRestedDon: EffectDefinition = {
  id: 'ST01-011.on-play-attach-rested-don', revision: '1', dslVersion: '1.3.0',
  source: { kind: 'CARD_DEFINITION', definitionId: `ST01-011@${revision}`, zone: 'characters' }, timing: 'ON_PLAY',
  condition: { kind: 'ALWAYS' }, cost: { kind: 'NONE' }, usage: { kind: 'UNLIMITED' }, program: [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'OWN_RESTED_DON' }, optional: true, min: 0, max: 2, bind: 'dons', visibility: 'PUBLIC' },
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'OWN_FIELD' }, optional: false, min: 1, max: 1, bind: 'target', visibility: 'PUBLIC', whenBindingNonempty: 'dons' },
    { kind: 'OPERATION', operation: { primitive: 'attachRestedDon', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: 'dons', targetBinding: 'target' } },
  ],
}

const sunnyBoost: EffectDefinition = {
  id: 'ST01-017.activate-main-boost', revision: '1', dslVersion: '1.3.0',
  source: { kind: 'CARD_DEFINITION', definitionId: `ST01-017@${revision}`, zone: 'stage' }, timing: 'ACTIVATE_MAIN',
  condition: { kind: 'ALWAYS' }, cost: { kind: 'REST_SOURCE' }, usage: { kind: 'UNLIMITED' }, program: [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'OWN_FIELD', trait: 'Straw Hat Crew' }, optional: true, min: 0, max: 1, bind: 'target', visibility: 'PUBLIC' },
    { kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: 'target', amount: 1000, duration: 'THIS_TURN' } },
  ],
}

const jetPistolProgram = (id: string, timing: 'MAIN' | 'TRIGGER', zone: 'hand' | 'temporary'): EffectDefinition => ({
  id, revision: '1', dslVersion: '1.3.0', source: { kind: 'CARD_DEFINITION', definitionId: `ST01-015@${revision}`, zone }, timing,
  condition: { kind: 'ALWAYS' }, cost: { kind: 'NONE' }, usage: { kind: 'UNLIMITED' }, program: [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'OPPONENT_CHARACTER', maximumPower: 6000 }, optional: true, min: 0, max: 1, bind: 'target', visibility: 'PUBLIC' },
    { kind: 'OPERATION', operation: { primitive: 'koCharacter', version: '1.0.0', player: 'OPPONENT', audience: 'PUBLIC', subjectBinding: 'target' } },
  ],
})
const jetPistolMain = jetPistolProgram('ST01-015.main-ko-character', 'MAIN', 'hand')
const jetPistolTrigger = jetPistolProgram('ST01-015.main-ko-character.trigger', 'TRIGGER', 'temporary')

const preventBlockerOnAttack = (number: 'ST01-002' | 'ST01-012', minimumBlockerPower?: number): EffectDefinition => ({
  id: `${number}.when-attacking-prevent-blocker`, revision: '1', dslVersion: '1.3.0',
  source: { kind: 'CARD_DEFINITION', definitionId: `${number}@${revision}`, zone: 'characters' }, timing: 'WHEN_ATTACKING',
  condition: { kind: 'SOURCE_ATTACHED_DON_AT_LEAST', minimum: 2 }, cost: { kind: 'NONE' }, usage: { kind: 'UNLIMITED' }, program: [
    { kind: 'OPERATION', operation: { primitive: 'preventBlocker', version: '1.0.0', player: 'OPPONENT', audience: 'PUBLIC',
      ...(minimumBlockerPower === undefined ? {} : { minimumBlockerPower }), duration: 'THIS_BATTLE' } },
  ],
})
const usoppTrigger: EffectDefinition = {
  id: 'ST01-002.when-attacking-prevent-blocker.trigger', revision: '1', dslVersion: '1.3.0',
  source: { kind: 'CARD_DEFINITION', definitionId: `ST01-002@${revision}`, zone: 'temporary' }, timing: 'TRIGGER',
  condition: { kind: 'ALWAYS' }, cost: { kind: 'NONE' }, usage: { kind: 'UNLIMITED' },
  program: playThisCardSteps(),
}
const diableJambeMain: EffectDefinition = {
  id: 'ST01-016.main-prevent-blocker', revision: '1', dslVersion: '1.3.0',
  source: { kind: 'CARD_DEFINITION', definitionId: `ST01-016@${revision}`, zone: 'hand' }, timing: 'MAIN',
  condition: { kind: 'ALWAYS' }, cost: { kind: 'NONE' }, usage: { kind: 'UNLIMITED' }, program: [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'OWN_FIELD', trait: 'Straw Hat Crew' }, optional: true, min: 0, max: 1, bind: 'attacker', visibility: 'PUBLIC' },
    { kind: 'OPERATION', operation: { primitive: 'preventBlocker', version: '1.0.0', player: 'OPPONENT', audience: 'PUBLIC', subjectBinding: 'attacker', duration: 'THIS_TURN' } },
  ],
}
const diableJambeTrigger: EffectDefinition = {
  id: 'ST01-016.trigger-ko-blocker', revision: '1', dslVersion: '1.3.0',
  source: { kind: 'CARD_DEFINITION', definitionId: `ST01-016@${revision}`, zone: 'temporary' }, timing: 'TRIGGER',
  condition: { kind: 'ALWAYS' }, cost: { kind: 'NONE' }, usage: { kind: 'UNLIMITED' }, program: [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'OPPONENT_BLOCKER_COST_AT_MOST', maximumCost: 3 }, optional: true, min: 0, max: 1, bind: 'target', visibility: 'PUBLIC' },
    { kind: 'OPERATION', operation: { primitive: 'koCharacter', version: '1.0.0', player: 'OPPONENT', audience: 'PUBLIC', subjectBinding: 'target' } },
  ],
}

export const ST01_LOCAL_ABILITY_DEFINITIONS = [ST01_JINBE_LOCAL_ABILITY, attachRestedDon, sunnyBoost, jetPistolMain, jetPistolTrigger,
  preventBlockerOnAttack('ST01-002', 5000), usoppTrigger, preventBlockerOnAttack('ST01-012'), diableJambeMain, diableJambeTrigger]
export const ST01_LOCAL_CONTINUOUS = [{ id: 'ST01-013.attached-don-power', definitionId: `ST01-013@${revision}`, zone: 'characters' as const, characteristic: 'POWER' as const, amount: 1000, minimumAttachedDon: 1 }]
export const ST01_LOCAL_CONDITIONAL_KEYWORDS = [{ id: 'ST01-004.conditional-rush', definitionId: `ST01-004@${revision}`, zone: 'characters' as const, keyword: 'RUSH' as const, minimumAttachedDon: 2 }]
