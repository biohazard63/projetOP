import type { CardInput } from './types'
import type { EffectRegistry } from '../effects/contracts'
import { OFFICIAL_ABILITY_CARDS, OFFICIAL_ABILITY_REGISTRY } from './officialAbilities'

const reviewedAt = '2026-10-12'
const revision = 'm3-2026-10-12'
const choice = (bind: string) => ({ kind: 'CHOICE' as const, choiceType: 'SELECT' as const, selector: { kind: 'OWN_LEADER_OR_CHARACTER' as const }, optional: true, min: 0, max: 1, bind, visibility: 'PUBLIC' as const })
const power = (bind: string, amount: number, duration: 'THIS_TURN' | 'THIS_BATTLE') => ({ kind: 'OPERATION' as const, operation: { primitive: 'addPower' as const, version: '1.0.0' as const, player: 'CONTROLLER' as const, audience: 'PUBLIC' as const, subjectBinding: bind, amount, duration } })
function event(number: string, nameFr: string, color: 'RED' | 'BLUE', cost: number, abilityId: string, effectOriginal: string, triggerOriginal: string, series: string): CardInput {
  return { number, printingKey: `${number}::standard`, databaseIds: [], nameFr, rulesName: nameFr, category: 'EVENT', colors: [color], attributes: [], traits: number === 'ST01-014' ? ['Animal', 'Straw Hat Crew'] : ['The Seven Warlords of the Sea', 'Kuja Pirates'], cost, power: null, counter: null, life: null, block: '1', extensions: [`ST-${number.slice(2,4)}`],
    review: { revision, references: [{ source: `https://en.onepiece-cardgame.com/cardlist/?series=${series}`, checkedAt: reviewedAt, language: 'en', detail: `${number}: printed cost, Counter, Trigger and errata page checked` }], faqChecked: true, errataChecked: true, effects: [{ kind: 'declarative', abilityIds: [abilityId, ...(triggerOriginal ? [`${abilityId}.trigger`] : [])] }], effectOriginal, effectFr: '', translationStatus: 'non_official_review_required', triggerOriginal, triggerFr: '', requiredCapabilities: triggerOriginal ? ['counterEvent', 'declarative', 'trigger'] : ['counterEvent', 'declarative'], playabilityStatus: 'DATA_VALID_EFFECT_PENDING', counterEvent: { kind: 'DECLARATIVE', printedCost: cost, abilityId, programVersion: '1.0.0' } } }
}
// Cards whose historic profile M3 changes get their own revision: the historic definitionId, its
// certification and saved games keep pointing at the unchanged official-2026-10-11 definition.
const M3_REVISED = new Set(['OP06-017', 'ST04-016'])
const revisedId = (definitionId: string) => {
  const [number] = definitionId.split('@')
  return M3_REVISED.has(number) ? `${number}@${revision}` : definitionId
}
export const M3_ABILITY_CARDS: CardInput[] = [
  ...structuredClone(OFFICIAL_ABILITY_CARDS).map(card => {
    if (M3_REVISED.has(card.number)) {
      const abilityId = `${card.number}.counter`
      const review = card.review!
      review.references.push({ source: review.references[0].source, checkedAt: reviewedAt, language: 'en', detail: `${card.number}: M3 declarative Counter profile; inherited ${review.revision} certification does not cover it` })
      review.revision = revision
      review.playabilityStatus = 'DATA_VALID_EFFECT_PENDING'
      review.counterEvent = { kind: 'DECLARATIVE', printedCost: card.cost as number, abilityId, programVersion: '1.0.0' }
      const declaration = review.effects.find(effect => effect.kind === 'declarative')
      if (declaration?.kind === 'declarative') declaration.abilityIds.push(abilityId)
      else review.effects.push({ kind: 'declarative', abilityIds: [abilityId] })
      review.requiredCapabilities = [...new Set([...review.requiredCapabilities, 'declarative'])]
    }
    return card
  }),
  event('ST01-014', 'Guard Point', 'RED', 1, 'ST01-014.counter', '[Counter] Up to 1 of your Leader or Character cards gains +3000 power during this battle.', '[Trigger] Up to 1 of your Leader or Character cards gains +1000 power during this turn.', '569001'),
  event('ST03-017', 'Love-Love Mellow', 'BLUE', 2, 'ST03-017.counter', '[Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, draw 1 card if you have 3 or less cards in your hand.', '', '569003'),
  { number:'OP01-016',printingKey:'OP01-016::standard',databaseIds:[],nameFr:'Nami',rulesName:'Nami',category:'CHARACTER',colors:['RED'],attributes:['SPECIAL'],traits:['Straw Hat Crew'],cost:1,power:2000,counter:1000,life:null,block:'1',extensions:['OP-01'],review:{revision,references:[{source:'https://en.onepiece-cardgame.com/cardlist/?series=569101',checkedAt:reviewedAt,language:'en',detail:'OP01-016: printed characteristics and On Play search'},{source:'https://en.onepiece-cardgame.com/pdf/qa_op01.pdf?20240405=',checkedAt:reviewedAt,language:'en',detail:'Nami cannot retrieve another Nami; when fewer than five cards remain, inspect all available cards'}],faqChecked:true,errataChecked:true,effects:[{kind:'declarative',abilityIds:['OP01-016.search']}],effectOriginal:'[On Play] Look at 5 cards from the top of your deck; reveal up to 1 {Straw Hat Crew} type card other than [Nami] and add it to your hand. Then, place the rest at the bottom of your deck in any order.',effectFr:'',translationStatus:'non_official_review_required',triggerOriginal:'',triggerFr:'',requiredCapabilities:['declarative'],playabilityStatus:'DATA_VALID_EFFECT_PENDING'}},
]
export const M3_ABILITY_REGISTRY: EffectRegistry = {
  ...structuredClone(OFFICIAL_ABILITY_REGISTRY),
  definitions: [...structuredClone(OFFICIAL_ABILITY_REGISTRY.definitions).map(d => d.source.kind === 'CARD_DEFINITION' ? { ...d, source: { ...d.source, definitionId: revisedId(d.source.definitionId) } } : d),
    { id: 'OP06-017.counter', revision: '1', dslVersion: '1.3.0', source: { kind: 'CARD_DEFINITION', definitionId: `OP06-017@${revision}`, zone: 'hand' }, timing: 'COUNTER', condition: { kind: 'ALWAYS' }, cost: { kind: 'NONE' }, optionalCost: 'TAKE_TOP_LIFE_TO_HAND', usage: { kind: 'UNLIMITED' }, program: [choice('target'), power('target', 3000, 'THIS_TURN')] },
    { id: 'ST04-016.counter', revision: '1', dslVersion: '1.3.0', source: { kind: 'CARD_DEFINITION', definitionId: `ST04-016@${revision}`, zone: 'hand' }, timing: 'COUNTER', condition: { kind: 'ALWAYS' }, cost: { kind: 'NONE' }, optionalCost: 'RETURN_ONE_DON', usage: { kind: 'UNLIMITED' }, program: [choice('target'), power('target', 4000, 'THIS_BATTLE')] },
    { id: 'ST01-014.counter', revision: '1', dslVersion: '1.3.0', source: { kind: 'CARD_DEFINITION', definitionId: `ST01-014@${revision}`, zone: 'hand' }, timing: 'COUNTER', condition: { kind: 'ALWAYS' }, cost: { kind: 'NONE' }, usage: { kind: 'UNLIMITED' }, program: [choice('target'), power('target', 3000, 'THIS_BATTLE')] },
    { id: 'ST01-014.counter.trigger', revision: '1', dslVersion: '1.3.0', source: { kind: 'CARD_DEFINITION', definitionId: `ST01-014@${revision}`, zone: 'temporary' }, timing: 'TRIGGER', condition: { kind: 'ALWAYS' }, cost: { kind: 'NONE' }, usage: { kind: 'UNLIMITED' }, program: [choice('target'), power('target', 1000, 'THIS_TURN')] },
    { id: 'ST03-017.counter', revision: '1', dslVersion: '1.3.0', source: { kind: 'CARD_DEFINITION', definitionId: `ST03-017@${revision}`, zone: 'hand' }, timing: 'COUNTER', condition: { kind: 'ALWAYS' }, cost: { kind: 'NONE' }, usage: { kind: 'UNLIMITED' }, program: [choice('target'), power('target', 4000, 'THIS_BATTLE'), { kind: 'OPERATION', operation: { primitive: 'drawCards', version: '1.0.0', player: 'CONTROLLER', audience: 'CONTROLLER', amount: 1 }, whenCondition: { kind: 'HAND_AT_MOST', player: 'CONTROLLER', maximum: 3 } }] },
    { id:'OP01-016.search',revision:'1',dslVersion:'1.3.0',source:{kind:'CARD_DEFINITION',definitionId:`OP01-016@${revision}`,zone:'characters'},timing:'ON_PLAY',condition:{kind:'ALWAYS'},cost:{kind:'NONE'},usage:{kind:'UNLIMITED'},program:[{kind:'SEARCH_TOP_DECK',amount:5,trait:'Straw Hat Crew',excludeRulesName:'Nami',maxSelected:1,bind:'found',revealSelected:true,destination:'hand',remainder:'BOTTOM_ANY_ORDER'}]},
  ],
}
