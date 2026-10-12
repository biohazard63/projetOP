import type { Ruleset } from './decks'
import { REVIEWED_CARDS } from '../cards/reviewedCards'
import { M3_ABILITY_CARDS } from '../cards/m3Abilities'
import { PURPLE_CARDS } from '../cards/m3PurpleDeck'
import { M0_RULESET } from './m0'
// Banned/restricted list re-read on 2026-10-12 (restriction.html lists the same numbers as the M0 subset).
// Reviewed subset only, not a certification of the Standard format. Capabilities are the executable
// families of this engine; createGame still requires a registered program for every declared ability.
export const M3_RULESET: Ruleset = {
  id: 'm3-reviewed-subset-2026-10-12', date: '2026-10-12', rulesVersion: '1.2.1', competitive: false,
  restrictionWindow: { from: '2026-10-12', through: '2026-10-12' },
  allowedNumbers: [...new Set([...Object.keys(REVIEWED_CARDS), ...M3_ABILITY_CARDS.map(c => c.number), ...PURPLE_CARDS.map(c => c.number)])],
  capabilities: ['giveRestedDon', 'blocker', 'declarative', 'counterEvent', 'trigger'],
  restrictions: structuredClone(M0_RULESET.restrictions),
}
