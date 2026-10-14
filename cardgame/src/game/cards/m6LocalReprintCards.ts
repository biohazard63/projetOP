import op01 from '../../../carteJson/OP-01/cards-OP-01.json'
import op02 from '../../../carteJson/OP-02/cards-OP-02.json'
import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { localCard, type LocalProfile, type LocalRow } from './localCards'
import { ability, check, ownLeaderOrCharacter, playChosen, power, rest, returnToHand, upTo } from './dsl'

// M6 cards that audited Starter Decks reprint from other sets (OP, EB, P...). Each card is the English row of its local
// cardJson (any set folder), reviewed against its official card list page, the FAQ of its set and the errata snapshot
// (docs/game/evidence/m6/sources/). No runtime branch depends on a card number.
const revision = 'm6-cardjson-2026-10-13', reviewedAt = '2026-10-13'
const def = (number: string) => `${number}@${revision}`
const FAQ: Record<string, string> = {
  OP01: 'https://en.onepiece-cardgame.com/pdf/qa_op01.pdf?20240405', OP02: 'https://en.onepiece-cardgame.com/pdf/qa_op02.pdf?20240405',
}
// Set folders bundled with this pack (static imports, as the other packs). A card is read from its own set's base printing.
const SETS: Record<string, LocalRow[]> = { 'OP-01': op01 as LocalRow[], 'OP-02': op02 as LocalRow[] }
function rowOf(number: string) {
  const set = `${number.slice(0, 2)}-${number.slice(2, 4)}`
  const row = SETS[set]?.find(r => r.code === number && (r as LocalRow & { id?: string }).id === number)
  if (!row) throw new Error(`LOCAL_CARD_MISSING:${number}`)
  return { row, set, file: `cardgame/carteJson/${set}/cards-${set}.json` }
}
function card(number: string, profile: LocalProfile): CardInput {
  const { row, set, file } = rowOf(number)
  const faq = FAQ[number.split('-')[0]]
  if (!faq) throw new Error(`FAQ_SOURCE_MISSING:${number}`)
  return localCard(row, set, file, revision, faq, reviewedAt, profile)
}
const don1 = { kind: 'SOURCE_ATTACHED_DON_AT_LEAST' as const, minimum: 1 }
const filmOrStrawHat = (maxCost: number) => playChosen('target', 'hand', { categories: ['CHARACTER'], maxCost, traitsAny: ['FILM', 'Straw Hat Crew'] })

const abilities: EffectDefinition[] = [
  // OP02-034 Tony Tony.Chopper: [DON!! x1] [When Attacking] Rest up to 1 of your opponent's Characters with a cost of 2 or less.
  ability('OP02-034.when-attacking-rest', def('OP02-034'), 'characters', 'WHEN_ATTACKING', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost: 2 }), rest('target')], { condition: don1 }),
  // OP02-035 Trafalgar Law: [Activate: Main] ➀ You may return this Character to the owner's hand: Play up to 1 Character
  // with a cost of 3 from your hand. Both costs (1 DON!! rested, this Character returned) are paid on activation.
  ability('OP02-035.activate-main-play', def('OP02-035'), 'characters', 'ACTIVATE_MAIN', [check('self', { kind: 'ALWAYS' }), returnToHand('self'),
    ...playChosen('target', 'hand', { categories: ['CHARACTER'], minCost: 3, maxCost: 3 })], { cost: { kind: 'REST_DON', amount: 1 } }),
  // OP02-037 Nico Robin / OP02-040 Brook / OP02-041 Monkey.D.Luffy: [On Play] Play up to 1 {FILM} or {Straw Hat Crew} type
  // Character card with a cost of 2 / 3 / 4 or less from your hand. Luffy also has [Blocker].
  ability('OP02-037.on-play-play', def('OP02-037'), 'characters', 'ON_PLAY', filmOrStrawHat(2)),
  ability('OP02-040.on-play-play', def('OP02-040'), 'characters', 'ON_PLAY', filmOrStrawHat(3)),
  ability('OP02-041.on-play-play', def('OP02-041'), 'characters', 'ON_PLAY', filmOrStrawHat(4)),
  // OP02-045 Three Sword Style Oni Giri: [Counter] Up to 1 of your Leader or Character cards gains +6000 power during this
  // battle. Then, play up to 1 Character card with a cost of 3 or less and no base effect from your hand.
  // [Trigger] Rest up to 1 of your opponent's Leader or Character cards with a cost of 5 or less (a Leader has no cost).
  ability('OP02-045.counter', def('OP02-045'), 'hand', 'COUNTER', [ownLeaderOrCharacter(1, 'target'), power('target', 6000, 'THIS_BATTLE'),
    ...playChosen('played', 'hand', { categories: ['CHARACTER'], maxCost: 3, noBaseEffect: true })]),
  ability('OP02-045.trigger-rest', def('OP02-045'), 'temporary', 'TRIGGER', [upTo(1, 'target', { side: 'OPPONENT', zone: 'leaderOrCharacters', maxCost: 5 }), rest('target')]),
]
const ids = (number: string) => abilities.filter(effect => effect.source.kind === 'CARD_DEFINITION' && effect.source.definitionId === def(number)).map(effect => effect.id)

export const REPRINT_LOCAL_CARDS: CardInput[] = [
  // OP01-025 Roronoa Zoro: [Rush] only.
  card('OP01-025', { keywords: ['RUSH'] }),
  card('OP02-034', { abilityIds: ids('OP02-034') }),
  card('OP02-035', { abilityIds: ids('OP02-035') }),
  card('OP02-037', { abilityIds: ids('OP02-037') }),
  card('OP02-040', { abilityIds: ids('OP02-040') }),
  card('OP02-041', { blocker: true, abilityIds: ids('OP02-041') }),
  card('OP02-045', { abilityIds: ids('OP02-045'), counterEvent: { abilityId: 'OP02-045.counter' } }),
]
export const REPRINT_LOCAL_ABILITY_DEFINITIONS = abilities
