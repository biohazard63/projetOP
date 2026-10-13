import rows from '../../../carteJson/ST-11/cards-ST-11.json'
import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { localCard, type LocalProfile, type LocalRow } from './localCards'
import { after, ability, bindAll, check, ko, ownLeaderOrCharacter, rest, setActive, trashFromHand, upTo } from './dsl'

// M6 ST-11 (Uta, green): its five ST11 numbers. Card text comes from local cardJson; the cached ST-11 FAQ and errata
// snapshot are in docs/game/evidence/m6/sources/. The OP02 reprints of the product are separate numbers (not in this pack).
const revision = 'm6-cardjson-2026-10-13', reviewedAt = '2026-10-13'
const def = (number: string) => `${number}@${revision}`
function card(number: string, profile: LocalProfile): CardInput {
  const row = (rows as LocalRow[]).find(item => item.code === number)
  if (!row) throw new Error(`LOCAL_CARD_MISSING:${number}`)
  return localCard(row, 'ST-11', 'cardgame/carteJson/ST-11/cards-ST-11.json', revision,
    'https://en.onepiece-cardgame.com/pdf/qa_st-11.pdf', reviewedAt, profile)
}
type Step = EffectDefinition['program'][number]
const uta = { kind: 'LEADER_NAME_IS' as const, name: 'Uta' }

const abilities: EffectDefinition[] = [
  // ST11-001 Leader Uta: [DON!! x1] [When Attacking] [Once Per Turn] Reveal the top card, add up to 1 {FILM} card among it to
  // your hand, then place the rest at the bottom (FAQ ST11-001: nothing remains once it is added).
  ability('ST11-001.when-attacking-reveal', def('ST11-001'), 'leader', 'WHEN_ATTACKING', [
    bindAll('revealed', { side: 'OWN', zone: 'deck', topN: 1 }), { kind: 'REVEAL_BINDING', bind: 'revealed' },
    { ...upTo(1, 'take', { side: 'OWN', zone: 'deck', topN: 1, inBinding: 'revealed', traitsAny: ['FILM'] }), skipIfNone: true } as Step,
    { kind: 'OPERATION', operation: { primitive: 'moveCard', version: '1.0.0', player: 'CONTROLLER', audience: 'CONTROLLER', subjectBinding: 'take', from: 'deck', to: 'hand' } },
    bindAll('rest', { side: 'OWN', zone: 'deck', topN: 1, inBinding: 'revealed' }),
    { kind: 'OPERATION', operation: { primitive: 'arrangeTopDeck', version: '1.0.0', audience: 'CONTROLLER', orderBinding: 'rest', bottomBinding: 'rest' } }],
  { condition: { kind: 'SOURCE_ATTACHED_DON_AT_LEAST', minimum: 1 }, usage: { kind: 'ONCE_PER_TURN' } }),
  // ST11-002 Uta: [Blocker]; [End of Your Turn] You may trash 1 Event from your hand: set up to 1 own {FILM} Character active.
  ability('ST11-002.end-of-turn-set-active', def('ST11-002'), 'characters', 'END_OF_YOUR_TURN', [upTo(1, 'discard', { side: 'OWN', zone: 'hand', categories: ['EVENT'] }), trashFromHand('discard', 'discard'),
    ...after('discard', [upTo(1, 'target', { side: 'OWN', zone: 'characters', traitsAny: ['FILM'] }), setActive('target')])]),
  // ST11-003 Backlight: [Main] If your Leader is [Uta], choose one: rest up to 1 opposing Character cost 5 or less, or K.O. up
  // to 1 opposing rested Character cost 5 or less.
  ability('ST11-003.main-mode', def('ST11-003'), 'hand', 'MAIN', [check('uta', uta), { kind: 'MODE', modes: 2, bind: 'mode', whenBindingNonempty: 'uta' },
    upTo(1, 'restTarget', { side: 'OPPONENT', zone: 'characters', maxCost: 5 }, { whenBindingNonempty: 'mode.0' }), rest('restTarget'),
    upTo(1, 'koTarget', { side: 'OPPONENT', zone: 'characters', maxCost: 5, rested: true }, { whenBindingNonempty: 'mode.1' }), ko('koTarget')]),
  // ST11-004 New Genesis: [Main] If your Leader is [Uta], look at 3, reveal up to 1 {FILM} card other than [New Genesis] to hand,
  // the rest at the bottom in any order, and set up to 1 of your DON!! as active (even without a card, FAQ ST11-004).
  ability('ST11-004.main-search', def('ST11-004'), 'hand', 'MAIN', [check('uta', uta),
    { kind: 'SEARCH_TOP_DECK', amount: 3, trait: 'FILM', excludeRulesName: 'New Genesis', maxSelected: 1, bind: 'found', revealSelected: true, destination: 'hand', remainder: 'BOTTOM_ANY_ORDER', whenBindingNonempty: 'uta' },
    upTo(1, 'don', { side: 'OWN', zone: 'cost', rested: true }, { whenBindingNonempty: 'uta' }), setActive('don')]),
  // ST11-005 I'm invincible: [Main] set up to 1 of your [Uta] Leader as active. [Trigger] up to 1 own Leader/Character +1000 this turn.
  ability('ST11-005.main-set-active', def('ST11-005'), 'hand', 'MAIN', [upTo(1, 'leader', { side: 'OWN', zone: 'leader', nameIs: 'Uta' }), setActive('leader')]),
  ability('ST11-005.trigger-power', def('ST11-005'), 'temporary', 'TRIGGER', [ownLeaderOrCharacter(1, 'target'),
    { kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: 'target', amount: 1000, duration: 'THIS_TURN' } }]),
]
const ids = (number: string) => abilities.filter(a => a.source.kind === 'CARD_DEFINITION' && a.source.definitionId === def(number)).map(a => a.id)
export const ST11_LOCAL_CARDS: CardInput[] = [
  card('ST11-001', { abilityIds: ids('ST11-001') }), card('ST11-002', { blocker: true, abilityIds: ids('ST11-002') }),
  card('ST11-003', { abilityIds: ids('ST11-003') }), card('ST11-004', { abilityIds: ids('ST11-004') }), card('ST11-005', { abilityIds: ids('ST11-005') }),
]
export const ST11_LOCAL_ABILITY_DEFINITIONS = abilities
