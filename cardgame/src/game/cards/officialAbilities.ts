import type { CardInput } from './types'
import type { EffectRegistry } from '../effects/contracts'
import { M0_GIVE_DON_PROGRAMS } from './m0Programs'

const cardList = 'https://en.onepiece-cardgame.com/cardlist/?series=569106'
const faq = 'https://en.onepiece-cardgame.com/pdf/qa_op06.pdf?20240419='
const checkedAt = '2026-10-11'
type Review = NonNullable<CardInput['review']>

export const SHURAIYA_ABILITY_ID = 'OP06-009.attack-or-block-base-power'
export const GATLING_TRIGGER_ID = 'OP06-018.trigger-ko'
export const FILM_SEARCH_ID = 'OP06-013.on-play-film-search'
export const METEOR_MAIN_ID = 'OP06-017.main-life-power'
export const GATLING_MAIN_ID = 'OP06-018.main-power-condition'

const review: Review = {
  revision: 'official-2026-10-11',
  references: [
    { source: cardList, checkedAt, language: 'en', detail: 'OP06-009: caractéristiques, Blocker et texte courant' },
    { source: faq, checkedAt, language: 'en', detail: 'OP06-009: la puissance est copiée au moment de l’activation; le Counter ultérieur ne change pas la valeur copiée' },
  ],
  faqChecked: true, errataChecked: true, playabilityStatus: 'PLAYABLE_VERIFIED',
  effects: [
    { kind: 'blocker', timing: 'BLOCK', cost: 'REST_SELF', target: 'SELF' },
    { kind: 'declarative', abilityIds: [SHURAIYA_ABILITY_ID] },
  ],
  effectOriginal: '[Blocker] [When Attacking]/[On Block] [Once Per Turn] This Character’s base power becomes the same as your opponent’s Leader until the start of your next turn.',
  effectFr: '', translationStatus: 'non_official_review_required', triggerOriginal: '', triggerFr: '',
  requiredCapabilities: ['blocker', 'declarative'],
}

export const OFFICIAL_ABILITY_CARDS: CardInput[] = [{
  number: 'OP06-009', printingKey: 'OP06-009::standard', databaseIds: [], nameFr: 'Shuraiya', rulesName: 'Shuraiya',
  category: 'CHARACTER', colors: ['RED'], attributes: ['STRIKE'], traits: ['FILM', 'Shipbuilding Town'],
  cost: 3, power: 4000, counter: 1000, life: null, block: '2', extensions: ['OP-06'], review,
}, {
  number: 'ST04-016', printingKey: 'ST04-016::standard', databaseIds: [], nameFr: 'Blast Breath', rulesName: 'Blast Breath',
  category: 'EVENT', colors: ['PURPLE'], attributes: [], traits: ['The Four Emperors', 'Animal Kingdom Pirates'], cost: 1, power: null, counter: null, life: null, block: '1', extensions: ['ST-04'],
  review: {
    revision: 'official-2026-10-11', references: [
      { source: 'https://en.onepiece-cardgame.com/cardlist/?series=569004', checkedAt, language: 'en', detail: 'ST04-016: coût imprimé et effet Counter DON!! −1 / +4000 pendant le combat' },
      { source: 'https://en.onepiece-cardgame.com/pdf/qa_st-01-st-04.pdf?20240405=', checkedAt, language: 'en', detail: 'FAQ ST-01/ST-04: le coût DON!! −1 peut être omis; l’effet suivant les deux-points ne s’applique alors pas' },
    ], faqChecked: true, errataChecked: true, playabilityStatus: 'DATA_VALID_EFFECT_PENDING', effects: [],
    effectOriginal: '[Counter] DON!! −1: Up to 1 of your Leader or Character cards gains +4000 power during this battle.',
    effectFr: '', translationStatus: 'non_official_review_required', triggerOriginal: '', triggerFr: '', requiredCapabilities: ['counterEvent'],
    counterEvent: { kind: 'DON_MINUS_POWER', printedCost: 1, donMinus: 1, powerBonus: 4000 },
  },
}, {
  number: 'OP06-013', printingKey: 'OP06-013::standard', databaseIds: [], nameFr: 'Monkey D. Luffy', rulesName: 'Monkey.D.Luffy',
  category: 'CHARACTER', colors: ['RED'], attributes: ['STRIKE'], traits: ['FILM', 'Straw Hat Crew'], cost: 2, power: 3000, counter: 1000, life: null, block: '2', extensions: ['OP-06'],
  review: {
    revision: 'official-2026-10-11', references: [
      { source: cardList, checkedAt, language: 'en', detail: 'OP06-013: caractéristiques, On Play de recherche FILM et Trigger qui active On Play' },
      { source: faq, checkedAt, language: 'en', detail: 'FAQ OP06-013: son Trigger n’est pas un effet de jeu sur le terrain' },
    ], faqChecked: true, errataChecked: true, playabilityStatus: 'PLAYABLE_VERIFIED', effects: [{ kind: 'declarative', abilityIds: [FILM_SEARCH_ID] }],
    effectOriginal: '[On Play] Look at 3 cards from the top of your deck; reveal up to 1 {FILM} type card and add it to your hand. Then, place the rest at the bottom of your deck in any order.',
    effectFr: '', translationStatus: 'non_official_review_required', triggerOriginal: '[Trigger] Activate this card’s [On Play] effect.', triggerFr: '', requiredCapabilities: ['declarative', 'trigger'],
  },
}, {
  number: 'OP06-017', printingKey: 'OP06-017::standard', databaseIds: [], nameFr: 'Meteor-Strike of Love', rulesName: 'Meteor-Strike of Love',
  category: 'EVENT', colors: ['RED'], attributes: [], traits: ['FILM', 'Straw Hat Crew'], cost: 2, power: null, counter: null, life: null, block: '2', extensions: ['OP-06'],
  review: {
    revision: 'official-2026-10-11', references: [
      { source: cardList, checkedAt, language: 'en', detail: 'OP06-017: coût 2, texte Main/Counter, coût facultatif depuis Life et +3000 pendant le tour' },
      { source: faq, checkedAt, language: 'en', detail: 'FAQ OP06 consultée; la mécanique de Trigger n’est pas utilisée dans ce profil Counter' },
    ], faqChecked: true, errataChecked: true, playabilityStatus: 'PLAYABLE_VERIFIED', effects: [{kind:'declarative',abilityIds:[METEOR_MAIN_ID]}], effectOriginal: '[Main]/[Counter] You may add 1 card from the top of your Life cards to your hand: Up to 1 of your Leader or Character cards gains +3000 power during this turn.',
    effectFr: '', translationStatus: 'non_official_review_required', triggerOriginal: '', triggerFr: '', requiredCapabilities: ['declarative', 'counterEvent'],
    counterEvent: { kind: 'OPTIONAL_LIFE_POWER', printedCost: 2, powerBonus: 3000 },
  },
}, {
  number: 'OP06-018', printingKey: 'OP06-018::standard', databaseIds: [], nameFr: 'Gum-Gum King Kong Gatling', rulesName: 'Gum-Gum King Kong Gatling',
  category: 'EVENT', colors: ['RED'], attributes: [], traits: ['FILM', 'Straw Hat Crew'], cost: 2, power: null, counter: null, life: null, block: '2', extensions: ['OP-06'],
  review: {
    revision: 'official-2026-10-11', references: [
      { source: cardList, checkedAt, language: 'en', detail: 'OP06-018: texte Main et Trigger, coût et caractéristiques imprimés' },
      { source: faq, checkedAt, language: 'en', detail: 'FAQ OP06 consultée; aucune décision additionnelle requise pour le Trigger K.O. retenu' },
    ], faqChecked: true, errataChecked: true, playabilityStatus: 'PLAYABLE_VERIFIED', effects: [{ kind: 'declarative', abilityIds: [GATLING_MAIN_ID, GATLING_TRIGGER_ID] }],
    effectOriginal: '[Main] Up to 1 of your Leader or Character cards gains +3000 power during this turn. Then, if your opponent has a Character with 7000 power or more, up to 1 of your Leader or Character cards gains +1000 power during this turn.',
    effectFr: '', translationStatus: 'non_official_review_required', triggerOriginal: '[Trigger] K.O. up to 1 of your opponent’s Characters with 5000 power or less.', triggerFr: '',
    requiredCapabilities: ['declarative', 'trigger'],
  },
}]

export const OFFICIAL_ABILITY_REGISTRY: EffectRegistry = {
  version: '1.3.0', dslVersion: '1.3.0', restrictions: [], replacements: [],
  definitions: [{
    id: SHURAIYA_ABILITY_ID, revision: '1', dslVersion: '1.3.0',
    source: { kind: 'CARD_DEFINITION', definitionId: 'OP06-009@official-2026-10-11', zone: 'characters' },
    timing: 'WHEN_ATTACKING_OR_ON_BLOCK', condition: { kind: 'ALWAYS' }, cost: { kind: 'NONE' }, usage: { kind: 'ONCE_PER_TURN' },
    program: [{ kind: 'OPERATION', operation: { primitive: 'setBasePowerFromOpponentLeader', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', duration: 'UNTIL_START_OF_NEXT_TURN' } }],
  }, {
    id: FILM_SEARCH_ID, revision: '1', dslVersion: '1.3.0', source: { kind: 'CARD_DEFINITION', definitionId: 'OP06-013@official-2026-10-11', zone: 'characters' },
    timing: 'ON_PLAY', condition: { kind: 'ALWAYS' }, cost: { kind: 'NONE' }, usage: { kind: 'UNLIMITED' },
    program: [{ kind: 'SEARCH_TOP_DECK', amount: 3, trait: 'FILM', maxSelected: 1, bind: 'film', revealSelected: true, destination: 'hand', remainder: 'BOTTOM_ANY_ORDER' }],
  }, {
    id: `${FILM_SEARCH_ID}.trigger`, revision: '1', dslVersion: '1.3.0', source: { kind: 'CARD_DEFINITION', definitionId: 'OP06-013@official-2026-10-11', zone: 'temporary' },
    timing: 'TRIGGER', condition: { kind: 'ALWAYS' }, cost: { kind: 'NONE' }, usage: { kind: 'UNLIMITED' },
    program: [{ kind: 'SEARCH_TOP_DECK', amount: 3, trait: 'FILM', maxSelected: 1, bind: 'film', revealSelected: true, destination: 'hand', remainder: 'BOTTOM_ANY_ORDER' }],
  }, {
    id: GATLING_TRIGGER_ID, revision: '1', dslVersion: '1.3.0',
    source: { kind: 'CARD_DEFINITION', definitionId: 'OP06-018@official-2026-10-11', zone: 'temporary' },
    timing: 'TRIGGER', condition: { kind: 'ALWAYS' }, cost: { kind: 'NONE' }, usage: { kind: 'UNLIMITED' },
    program: [
      { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'OPPONENT_CHARACTER', maximumPower: 5000, powerBasis: 'CURRENT' }, min: 0, max: 1, optional: true, bind: 'target', visibility: 'PUBLIC' },
      { kind: 'OPERATION', operation: { primitive: 'koCharacter', version: '1.0.0', player: 'OPPONENT', audience: 'PUBLIC', subjectBinding: 'target' } },
    ],
  }, {
    id:METEOR_MAIN_ID,revision:'1',dslVersion:'1.3.0',source:{kind:'CARD_DEFINITION',definitionId:'OP06-017@official-2026-10-11',zone:'hand'},timing:'MAIN',
    condition:{kind:'ALWAYS'},cost:{kind:'NONE'},optionalCost:'TAKE_TOP_LIFE_TO_HAND',usage:{kind:'UNLIMITED'},program:[
      {kind:'CHOICE',choiceType:'SELECT',selector:{kind:'OWN_LEADER_OR_CHARACTER'},optional:true,min:0,max:1,bind:'target',visibility:'PUBLIC'},
      {kind:'OPERATION',operation:{primitive:'addPower',version:'1.0.0',player:'CONTROLLER',audience:'PUBLIC',subjectBinding:'target',amount:3000,duration:'THIS_TURN'}},
    ],
  }, {
    id:GATLING_MAIN_ID,revision:'1',dslVersion:'1.3.0',source:{kind:'CARD_DEFINITION',definitionId:'OP06-018@official-2026-10-11',zone:'hand'},timing:'MAIN',
    condition:{kind:'ALWAYS'},cost:{kind:'NONE'},usage:{kind:'UNLIMITED'},program:[
      {kind:'CHOICE',choiceType:'SELECT',selector:{kind:'OWN_LEADER_OR_CHARACTER'},optional:true,min:0,max:1,bind:'firstTarget',visibility:'PUBLIC'},
      {kind:'OPERATION',operation:{primitive:'addPower',version:'1.0.0',player:'CONTROLLER',audience:'PUBLIC',subjectBinding:'firstTarget',amount:3000,duration:'THIS_TURN'}},
      {kind:'CHOICE',choiceType:'SELECT',selector:{kind:'OWN_LEADER_OR_CHARACTER'},optional:true,min:0,max:1,bind:'secondTarget',visibility:'PUBLIC',whenCondition:{kind:'OPPONENT_CHARACTER_POWER_AT_LEAST',minimum:7000,powerBasis:'CURRENT'}},
      {kind:'OPERATION',operation:{primitive:'addPower',version:'1.0.0',player:'CONTROLLER',audience:'PUBLIC',subjectBinding:'secondTarget',amount:1000,duration:'THIS_TURN'}},
    ],
  }, ...M0_GIVE_DON_PROGRAMS],
}
