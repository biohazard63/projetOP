import type { Ruleset } from './decks'
import { M3_RULESET } from './m3'
import { M5_CARDS } from '../cards/m5Catalog'
// Same verified restriction list as M3 (re-read on 2026-10-12), with the M5 recognised cards admitted.
export const M5_RULESET: Ruleset = {
  ...structuredClone(M3_RULESET), id: 'm5-reviewed-subset-2026-10-12',
  allowedNumbers: [...new Set([...M3_RULESET.allowedNumbers, ...M5_CARDS.map(c => c.number)])],
}
