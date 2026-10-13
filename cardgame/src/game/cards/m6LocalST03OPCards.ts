import op01 from '../../../carteJson/OP-01/cards-OP-01.json'
import op07 from '../../../carteJson/OP-07/cards-OP-07.json'
import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { localCard, type LocalProfile, type LocalRow } from './localCards'
import { ability, drawThenTrash, draw, lookTopAndPlace, ownLeaderOrCharacter, power, upTo } from './dsl'

// M6 ST-03 composition: scripts/rebuildStarterDecks.ts (parsed as text) names "Desert Spada" and "Perfume Femur"; its own
// cross-set name lookup resolves them to OP01-088 and OP07-057 (no ST-03 card bears these names). Card text comes from
// local cardJson; the OP-01/OP-07 FAQ and the errata snapshot are in docs/game/evidence/m6/sources/.
const revision = 'm6-cardjson-2026-10-13', reviewedAt = '2026-10-13'
const def = (number: string) => `${number}@${revision}`
const sets = {
  'OP-01': { rows: op01 as LocalRow[], faq: 'https://en.onepiece-cardgame.com/pdf/qa_op01.pdf?20240405' },
  'OP-07': { rows: op07 as LocalRow[], faq: 'https://en.onepiece-cardgame.com/pdf/qa_op07.pdf?20250228' },
}
function card(setCode: keyof typeof sets, number: string, profile: LocalProfile): CardInput {
  const row = sets[setCode].rows.find(item => item.code === number)
  if (!row) throw new Error(`LOCAL_CARD_MISSING:${number}`)
  return localCard(row, setCode, `cardgame/carteJson/${setCode}/cards-${setCode}.json`, revision, sets[setCode].faq, reviewedAt, profile)
}
const warlord = { side: 'OWN' as const, zone: 'leaderOrCharacters' as const, traitsAny: ['The Seven Warlords of the Sea'] }

const abilities: EffectDefinition[] = [
  // OP01-088 Desert Spada (errata 2023-02-17): [Counter] Up to 1 of your Leader or Character cards gains +2000 power during
  // this battle. Then, look at 3 and place them at the top or bottom in any order (FAQ: all 3 on the same side; allowed
  // with 2 or less cards in deck). [Trigger] Draw 2 cards and trash 1 card from your hand.
  ability('OP01-088.counter', def('OP01-088'), 'hand', 'COUNTER', [ownLeaderOrCharacter(1, 'target'), power('target', 2000, 'THIS_BATTLE'), ...lookTopAndPlace(3)]),
  ability('OP01-088.trigger-draw-trash', def('OP01-088'), 'temporary', 'TRIGGER', drawThenTrash(2, 1)),
  // OP07-057 Perfume Femur: [Main] Select up to 1 of your {The Seven Warlords of the Sea} type Leader or Character cards:
  // +2000 power this turn; then, if the selected card attacks during this turn, your opponent cannot activate [Blocker].
  // [Trigger] Draw 1 card.
  ability('OP07-057.main-power-prevent-blocker', def('OP07-057'), 'hand', 'MAIN', [upTo(1, 'target', warlord), power('target', 2000, 'THIS_TURN'),
    { kind: 'OPERATION', operation: { primitive: 'preventBlocker', version: '1.0.0', player: 'OPPONENT', audience: 'PUBLIC', subjectBinding: 'target', duration: 'THIS_TURN' }, whenBindingNonempty: 'target' }]),
  ability('OP07-057.trigger-draw', def('OP07-057'), 'temporary', 'TRIGGER', [draw(1)]),
]
const ids = (number: string) => abilities.filter(effect => effect.source.kind === 'CARD_DEFINITION' && effect.source.definitionId === def(number)).map(effect => effect.id)

export const ST03_OP_LOCAL_CARDS: CardInput[] = [
  card('OP-01', 'OP01-088', { abilityIds: ids('OP01-088'), counterEvent: { abilityId: 'OP01-088.counter' } }),
  card('OP-07', 'OP07-057', { abilityIds: ids('OP07-057') }),
]
export const ST03_OP_LOCAL_ABILITY_DEFINITIONS = abilities
