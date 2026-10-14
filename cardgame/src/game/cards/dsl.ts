import type { EffectDefinition } from '../effects/contracts'

// M6 reusable DSL fragments. They only assemble declarative steps; the runtime never sees a card number.
type Step = EffectDefinition['program'][number]
/** "[Trigger] Play this card." — with 5 Characters, the controller first chooses 1 Character to trash (CR 1.2.1 §3-7-6-1). */
export function playThisCardSteps(): Step[] {
  return [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'characters' }, optional: false, min: 1, max: 1, bind: 'replace', visibility: 'PUBLIC', whenCondition: { kind: 'OWN_CHARACTERS_AT_LEAST', minimum: 5 } },
    { kind: 'OPERATION', operation: { primitive: 'playSelfFromTrigger', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', replaceBinding: 'replace' } },
  ]
}

type Selector = Extract<Step, { kind: 'CHOICE' }>['selector']
type CardsFilter = Omit<Extract<Selector, { kind: 'CARDS' }>, 'kind'>
type Timing = EffectDefinition['timing']
type Zone = Extract<EffectDefinition['source'], { kind: 'CARD_DEFINITION' }>['zone']
/** One declarative ability of `definitionId`. Defaults: no condition, no cost, unlimited, DSL 1.3.0. */
export function ability(id: string, definitionId: string, zone: Zone, timing: Timing, program: Step[], extra: Partial<Pick<EffectDefinition, 'condition' | 'cost' | 'usage' | 'optionalCost'>> = {}): EffectDefinition {
  return { id, revision: '1', dslVersion: '1.3.0', source: { kind: 'CARD_DEFINITION', definitionId, zone }, timing,
    condition: extra.condition ?? { kind: 'ALWAYS' }, cost: extra.cost ?? { kind: 'NONE' }, ...(extra.optionalCost ? { optionalCost: extra.optionalCost } : {}), usage: extra.usage ?? { kind: 'UNLIMITED' }, program }
}
/** "up to `max`" choice over a generic card filter (optional, may choose 0). Hidden zones are chosen privately. */
export function upTo(max: number, bind: string, filter: CardsFilter, opts: { required?: boolean; whenBindingNonempty?: string } = {}): Step {
  const hidden = ['hand', 'deck'].includes(filter.zone)
  return { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', ...filter }, optional: !opts.required, min: opts.required ? 1 : 0, max, bind, visibility: hidden ? 'PRIVATE' : 'PUBLIC',
    ...(opts.whenBindingNonempty ? { whenBindingNonempty: opts.whenBindingNonempty } : {}) }
}
export const ownLeaderOrCharacter = (max: number, bind: string): Step => ({ kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'OWN_LEADER_OR_CHARACTER' }, optional: true, min: 0, max, bind, visibility: 'PUBLIC' })
export const ko = (bind: string): Step => ({ kind: 'OPERATION', operation: { primitive: 'koCharacter', version: '1.0.0', player: 'OPPONENT', audience: 'PUBLIC', subjectBinding: bind } })
/** K.O. every bound Character of either player ("K.O. all ...", "K.O. this Character"); `result` collects those K.O.'d. */
export const koAny = (bind: string, opts: { result?: string; whenBindingNonempty?: string } = {}): Step => ({ kind: 'OPERATION', operation: { primitive: 'koCharacter', version: '1.0.0', player: 'ANY', audience: 'PUBLIC', subjectBinding: bind, ...(opts.result ? { resultBinding: opts.result } : {}) }, ...(opts.whenBindingNonempty ? { whenBindingNonempty: opts.whenBindingNonempty } : {}) })
/** "Give up to 1 rested DON!! card to <bound Leader/Character>". */
export function giveRestedDon(target: string): Step[] {
  return [upTo(1, 'restedDon', { side: 'OWN', zone: 'cost', rested: true }),
    { kind: 'OPERATION', operation: { primitive: 'attachRestedDon', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: 'restedDon', targetBinding: target } }]
}
export const returnToHand = (bind: string): Step => ({ kind: 'OPERATION', operation: { primitive: 'returnToHand', version: '1.0.0', audience: 'PUBLIC', subjectBinding: bind } })
export const toDeckBottom = (bind: string): Step => ({ kind: 'OPERATION', operation: { primitive: 'moveToDeckBottom', version: '1.0.0', audience: 'PUBLIC', subjectBinding: bind } })
export const rest = (bind: string): Step => ({ kind: 'OPERATION', operation: { primitive: 'restCard', version: '1.0.0', audience: 'PUBLIC', subjectBinding: bind } })
export const setActive = (bind?: string): Step => ({ kind: 'OPERATION', operation: { primitive: 'setActive', version: '1.0.0', audience: 'PUBLIC', ...(bind ? { subjectBinding: bind } : {}) } })
export const power = (bind: string, amount: number, duration: 'THIS_TURN' | 'THIS_BATTLE'): Step => ({ kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: bind, amount, duration } })
/** "give up to N of your opponent's Characters −X power during this turn" (bound opposing Leader/Characters). */
export const opponentPower = (amount: number, bind = 'target'): Step => ({ kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'OPPONENT', audience: 'PUBLIC', subjectBinding: bind, amount, duration: 'THIS_TURN' } })
export const draw = (amount: number): Step => ({ kind: 'OPERATION', operation: { primitive: 'drawCards', version: '1.0.0', player: 'CONTROLLER', audience: 'CONTROLLER', amount } })
/** Trash the bound card(s) of the controller's hand (public once in the trash). */
export const trashFromHand = (bind: string, whenBindingNonempty?: string): Step => ({ kind: 'OPERATION', operation: { primitive: 'moveCard', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: bind, from: 'hand', to: 'trash' }, ...(whenBindingNonempty ? { whenBindingNonempty } : {}) })
/** "add up to 1 DON!! card from your DON!! deck and set it as active / rest it". */
export const addDon = (rested: boolean, opts: { whenBindingNonempty?: string; whenCondition?: Extract<Step, { kind: 'OPERATION' }>['whenCondition'] } = {}): Step => ({ kind: 'OPERATION', operation: { primitive: 'moveDon', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', from: 'donDeck', to: 'cost', rested }, ...(opts.whenCondition ? { whenCondition: opts.whenCondition } : {}), ...(opts.whenBindingNonempty ? { whenBindingNonempty: opts.whenBindingNonempty } : {}) })
/** "DON!! −X: ..." inside an automatic ability: pay exactly X field DON!! or nothing (then the rest is skipped). */
export function donMinus(amount: number, bind = 'donMinus'): Step[] {
  return [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'fieldDon' }, optional: true, min: 0, max: amount, bind, visibility: 'PUBLIC', allOrNone: true, whenCondition: { kind: 'FIELD_DON_AT_LEAST', minimum: amount } },
    { kind: 'OPERATION', operation: { primitive: 'returnDon', version: '1.0.0', audience: 'PUBLIC', subjectBinding: bind }, whenBindingNonempty: bind },
  ]
}
/** Adds `whenBindingNonempty` to every step (the part after an optional cost). */
export const after = (bind: string, steps: Step[]): Step[] => steps.map(step => step.kind === 'OPERATION' || step.kind === 'CHOICE' ? { ...step, whenBindingNonempty: step.whenBindingNonempty ?? bind } : step)
export const grantRush = (bind?: string): Step => ({ kind: 'OPERATION', operation: { primitive: 'grantKeyword', version: '1.0.0', audience: 'PUBLIC', keyword: 'RUSH', duration: 'THIS_TURN', ...(bind ? { subjectBinding: bind } : {}) } })
export const moveFromTrashToHand = (bind: string): Step => ({ kind: 'OPERATION', operation: { primitive: 'moveCard', version: '1.0.0', player: 'CONTROLLER', audience: 'CONTROLLER', subjectBinding: bind, from: 'trash', to: 'hand' } })
export const shuffleDeck = (): Step => ({ kind: 'SHUFFLE_DECK', player: 'CONTROLLER' })
/** "Draw N cards and trash M cards from your hand" (both whenever possible). */
export function drawThenTrash(drawN: number, trashN: number): Step[] {
  return [draw(drawN), { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: false, min: trashN, max: trashN, bind: 'discard', visibility: 'PRIVATE', clampMin: true }, trashFromHand('discard')]
}
/** "Play up to 1 card ... from your hand/deck/trash": choose, then (5 Characters) choose one to trash, then play. */
export function playChosen(bind: string, from: 'hand' | 'deck' | 'trash', filter: Omit<CardsFilter, 'side' | 'zone'>, opts: { rested?: boolean; skipIfNone?: boolean; whenBindingNonempty?: string } = {}): Step[] {
  const choice = upTo(1, bind, { side: 'OWN', zone: from, categories: ['CHARACTER', 'STAGE'], ...filter }, { whenBindingNonempty: opts.whenBindingNonempty })
  return [
    opts.skipIfNone && choice.kind === 'CHOICE' ? { ...choice, skipIfNone: true } : choice,
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'characters' }, optional: false, min: 1, max: 1, bind: `${bind}.replace`, visibility: 'PUBLIC', whenBindingNonempty: bind, whenCondition: { kind: 'OWN_CHARACTERS_AT_LEAST', minimum: 5 } },
    { kind: 'OPERATION', operation: { primitive: 'playCard', version: '1.0.0', audience: 'PUBLIC', subjectBinding: bind, from, replaceBinding: `${bind}.replace`, ...(opts.rested ? { rested: true as const } : {}) } },
  ]
}
/** "Reveal 1 card from the top of your deck and play up to 1 <filter> card (rested). Then, place the rest at the top or
 * bottom of your deck" (FAQ ST12-010: only the revealed card can be played; "the rest" is that card if not played). */
export function revealTopAndPlay(bind: string, filter: Omit<CardsFilter, 'side' | 'zone'>, opts: { rested?: boolean } = {}): Step[] {
  return [
    bindAll(bind, { side: 'OWN', zone: 'deck', topN: 1 }), { kind: 'REVEAL_BINDING', bind },
    ...playChosen(`${bind}.play`, 'deck', { topN: 1, inBinding: bind, ...filter }, { rested: opts.rested, skipIfNone: true }),
    ...revealedRestTopOrBottom(bind),
  ]
}
/** The revealed card not taken stays on top or goes to the bottom of the deck (the owner's choice). */
export function revealedRestTopOrBottom(bind: string): Step[] {
  return [
    bindAll(`${bind}.rest`, { side: 'OWN', zone: 'deck', topN: 1, inBinding: bind }),
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'deck', topN: 1, inBinding: bind }, optional: true, min: 0, max: 1, bind: `${bind}.bottom`, visibility: 'PRIVATE', allOrNone: true, skipIfNone: true },
    { kind: 'OPERATION', operation: { primitive: 'arrangeTopDeck', version: '1.0.0', audience: 'CONTROLLER', orderBinding: `${bind}.rest`, bottomBinding: `${bind}.bottom` } },
  ]
}
export const powerUntilNextTurn = (amount: number, bind?: string, whenBindingNonempty?: string): Step => ({ kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', amount, duration: 'UNTIL_START_OF_YOUR_NEXT_TURN', ...(bind ? { subjectBinding: bind } : {}) }, ...(whenBindingNonempty ? { whenBindingNonempty } : {}) })
/** "Look at N cards from the top of your deck and return them to the top or bottom of the deck in any order". */
export function lookTopAndPlace(n: number): Step[] {
  return [
    { kind: 'CHOICE', choiceType: 'ORDER', selector: { kind: 'CARDS', side: 'OWN', zone: 'deck', topN: n }, optional: false, min: 0, max: n, bind: 'look.order', visibility: 'PRIVATE' },
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'deck', topN: n }, optional: true, min: 0, max: n, bind: 'look.bottom', visibility: 'PRIVATE', allOrNone: true },
    { kind: 'OPERATION', operation: { primitive: 'arrangeTopDeck', version: '1.0.0', audience: 'CONTROLLER', orderBinding: 'look.order', bottomBinding: 'look.bottom' } },
  ]
}
export const bindAll = (bind: string, filter: CardsFilter): Step => ({ kind: 'BIND_ALL', selector: { kind: 'CARDS', ...filter }, bind })
export const check = (bind: string, condition: Extract<Step, { kind: 'OPERATION' }>['whenCondition'] & object): Step => ({ kind: 'CHECK', condition, bind })
export const addCost = (bind: string, amount: number, duration: 'THIS_TURN' | 'UNTIL_END_OF_OPPONENT_NEXT_TURN' = 'THIS_TURN'): Step => ({ kind: 'OPERATION', operation: { primitive: 'addCost', version: '1.0.0', audience: 'PUBLIC', subjectBinding: bind, amount, duration } })
export const preventKO = (bind?: string): Step => ({ kind: 'OPERATION', operation: { primitive: 'preventKO', version: '1.0.0', audience: 'PUBLIC', duration: 'THIS_TURN', ...(bind ? { subjectBinding: bind } : {}) } })
export const grantDoubleAttack = (bind?: string): Step => ({ kind: 'OPERATION', operation: { primitive: 'grantKeyword', version: '1.0.0', audience: 'PUBLIC', keyword: 'DOUBLE_ATTACK', duration: 'THIS_TURN', ...(bind ? { subjectBinding: bind } : {}) } })
export const powerSelf = (amount: number): Step => ({ kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', amount, duration: 'THIS_TURN' } })
/** "Your opponent chooses 1 card from their hand and trashes it" (nothing if their hand is empty). */
export function opponentTrashesFromHand(): Step[] {
  return [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: false, min: 1, max: 1, bind: 'oppDiscard', visibility: 'PRIVATE', chooser: 'OPPONENT', clampMin: true, whenCondition: { kind: 'HAND_AT_LEAST', player: 'OPPONENT', minimum: 1 } },
    { kind: 'OPERATION', operation: { primitive: 'moveCard', version: '1.0.0', player: 'OPPONENT', audience: 'PUBLIC', subjectBinding: 'oppDiscard', from: 'hand', to: 'trash' } },
  ]
}
/** "add 1 card from the top or bottom of your Life cards to your hand" (`required`: an activation cost already paid). */
export function lifeToHand(bind = 'lifeCost', opts: { required?: boolean; lifeEnd?: 'TOP' | 'TOP_OR_BOTTOM' } = {}): Step[] {
  return [{ kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'life', lifeEnd: opts.lifeEnd ?? 'TOP_OR_BOTTOM' }, optional: !opts.required, min: opts.required ? 1 : 0, max: 1, bind, visibility: 'PUBLIC' },
    { kind: 'OPERATION', operation: { primitive: 'lifeToHand', version: '1.0.0', audience: 'CONTROLLER', subjectBinding: bind } }]
}
/** "Add <bound card> to the top of the (owner's) Life cards" (face-up only when printed). */
export const addToLife = (bind: string, from: 'hand' | 'deck' | 'characters', faceUp = false, whenBindingNonempty?: string): Step => ({ kind: 'OPERATION', operation: { primitive: 'addToLife', version: '1.0.0', audience: from === 'characters' ? 'PUBLIC' : 'CONTROLLER', subjectBinding: bind, from, faceUp }, ...(whenBindingNonempty ? { whenBindingNonempty } : {}) })
/** "Add up to 1 card from the top of your deck to the top of your Life cards" (not looked at). */
export function deckTopToLife(bind = 'deckTop', whenBindingNonempty?: string): Step[] {
  return [{ kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'deck', topN: 1 }, optional: true, min: 0, max: 1, bind, visibility: 'PRIVATE', conceal: true, ...(whenBindingNonempty ? { whenBindingNonempty } : {}) },
    addToLife(bind, 'deck')]
}
/** "Look at up to 1 card from the top of your or your opponent's Life cards, and place it at the top or bottom of the Life cards." */
export function peekLife(): Step[] {
  return [{ kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'ANY', zone: 'life', lifeEnd: 'TOP' }, optional: true, min: 0, max: 1, bind: 'peek', visibility: 'PRIVATE', reveal: 'CHOOSER' },
    // Mode 0: keep it on top; mode 1: place it at the bottom.
    { kind: 'MODE', modes: 2, bind: 'peek.place', whenBindingNonempty: 'peek' },
    { kind: 'OPERATION', operation: { primitive: 'placeLife', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'peek', bottomBinding: 'peek.place.1' } }]
}
/** "Your opponent chooses one: - Trash 1 card from the top of your opponent's Life cards. - Add 1 card from the top of your
 * deck to the top of your Life cards." (FAQ ST07-010/015: the first trashes the chooser's own top Life, possibly nothing). */
export function opponentChoosesLifeMode(): Step[] {
  return [{ kind: 'MODE', modes: 2, bind: 'mode', chooser: 'OPPONENT' },
    bindAll('oppLife', { side: 'OPPONENT', zone: 'life', lifeEnd: 'TOP' }),
    { kind: 'OPERATION', operation: { primitive: 'trashLife', version: '1.0.0', player: 'OPPONENT', audience: 'PUBLIC', subjectBinding: 'oppLife' }, whenBindingNonempty: 'mode.0' },
    bindAll('ownDeckTop', { side: 'OWN', zone: 'deck', topN: 1 }),
    addToLife('ownDeckTop', 'deck', false, 'mode.1')]
}
export const grantKeyword = (keyword: 'RUSH' | 'DOUBLE_ATTACK' | 'BANISH', duration: 'THIS_TURN' | 'THIS_BATTLE', bind?: string, whenBindingNonempty?: string): Step => ({ kind: 'OPERATION', operation: { primitive: 'grantKeyword', version: '1.0.0', audience: 'PUBLIC', keyword, duration, ...(bind ? { subjectBinding: bind } : {}) }, ...(whenBindingNonempty ? { whenBindingNonempty } : {}) })
