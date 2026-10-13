import type { Ruleset } from './decks'
import { M5_RULESET } from './m5'
// M6 Lots B/C: certified ST-03, ST-04, ST-05 and ST-06 numbers; M6 ST-07, ST-08, ST-12, ST-09 (except ST09-010) ST10-001..017 and ST11-001..005: their certified numbers.
const M6_ADMITTED = ['ST04-017', ...Array.from({ length: 15 }, (_, i) => `ST08-${String(i + 1).padStart(3, '0')}`), ...Array.from({ length: 17 }, (_, i) => `ST07-${String(i + 1).padStart(3, '0')}`), ...Array.from({ length: 17 }, (_, i) => `ST12-${String(i + 1).padStart(3, '0')}`), ...Array.from({ length: 15 }, (_, i) => `ST09-${String(i + 1).padStart(3, '0')}`).filter(n => n !== 'ST09-010'), ...Array.from({ length: 5 }, (_, i) => `ST11-00${i + 1}`), ...Array.from({ length: 17 }, (_, i) => `ST10-${String(i + 1).padStart(3, '0')}`), ...['ST05', 'ST06'].flatMap(set => Array.from({ length: 17 }, (_, i) => `${set}-${String(i + 1).padStart(3, '0')}`)), 'ST03-001', 'ST03-003', 'ST03-010', 'ST03-004', 'ST03-005', 'ST03-007', 'ST03-009', 'ST03-013', 'ST03-014', 'ST03-015', 'ST03-016', 'ST03-017', 'ST04-001', 'ST04-002', 'ST04-003', 'ST04-004', 'ST04-005', 'ST04-006', 'ST04-008', 'ST04-010', 'ST04-014', 'ST04-015', 'ST04-016', 'OP01-088', 'OP07-057']
// MUGIWARA_FREE — permanent Mugiwara format (no calendar window, no official ban/limit/pair list).
// Unchanged from the official subset: Comprehensive Rules 1.2.1 (1 Leader, 50 cards, at most 4 copies per number,
// Leader colours, DON!! and battle rules are engine rules), and only cards the engine implements are admitted
// (allowedNumbers and capabilities are those of the reviewed M5 catalogue). An official format stays separate.
export const FREE_RULESET_ID = 'MUGIWARA_FREE'
export const FREE_RULESET: Ruleset = {
  id: FREE_RULESET_ID, format: 'FREE', date: '2026-10-12', rulesVersion: '1.2.1', competitive: false,
  restrictionWindow: null, restrictions: [],
  // M6 official OP01 ability profiles admitted only after their generic programs and regression tests exist.
  // M6 Lot A: ST-01 and ST-02 are admitted once all 17 numbers of each are certified (src/game/cards/certification.ts).
  allowedNumbers: [...new Set([...M5_RULESET.allowedNumbers, 'OP01-006', 'OP01-007', ...['ST01', 'ST02'].flatMap(set => Array.from({ length: 17 }, (_, i) => `${set}-${String(i + 1).padStart(3, '0')}`)), ...M6_ADMITTED])], capabilities: [...M5_RULESET.capabilities],
}
