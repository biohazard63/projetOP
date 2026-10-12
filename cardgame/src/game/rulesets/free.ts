import type { Ruleset } from './decks'
import { M5_RULESET } from './m5'
// MUGIWARA_FREE — permanent Mugiwara format (no calendar window, no official ban/limit/pair list).
// Unchanged from the official subset: Comprehensive Rules 1.2.1 (1 Leader, 50 cards, at most 4 copies per number,
// Leader colours, DON!! and battle rules are engine rules), and only cards the engine implements are admitted
// (allowedNumbers and capabilities are those of the reviewed M5 catalogue). An official format stays separate.
export const FREE_RULESET_ID = 'MUGIWARA_FREE'
export const FREE_RULESET: Ruleset = {
  id: FREE_RULESET_ID, format: 'FREE', date: '2026-10-12', rulesVersion: '1.2.1', competitive: false,
  restrictionWindow: null, restrictions: [],
  allowedNumbers: [...M5_RULESET.allowedNumbers], capabilities: [...M5_RULESET.capabilities],
}
