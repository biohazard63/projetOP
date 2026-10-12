import type { Ruleset } from './decks'
import { REVIEWED_CARDS } from '../cards/reviewedCards'
// Checked on 2026-10-10. This is a reviewed subset, not certification of Standard format.
const source = 'https://en.onepiece-cardgame.com/news/restriction.html'
export const M0_RULESET: Ruleset = {
  id: 'm0-reviewed-subset-2026-10-10', date: '2026-10-10', rulesVersion: '1.2.1', competitive: false,
  restrictionWindow: { from: '2026-10-10', through: '2026-10-12' },
  allowedNumbers: Object.keys(REVIEWED_CARDS),
  // No resolver has been implemented yet. The effects cannot silently disappear.
  capabilities: [],
  restrictions: [
    ...['OP06-047', 'OP03-040', 'OP06-086', 'ST10-001', 'OP06-116'].map(number => ({ kind: 'banned' as const, number, effectiveFrom: '2026-10-10', source })),
    ...([['OP07-115', 'EB04-058'], ['OP11-040', 'OP11-067'], ['OP11-040', 'OP08-069']] as [string, string][]).map(numbers => ({ kind: 'pair' as const, numbers, effectiveFrom: '2026-10-10', source })),
    { kind: 'banned', number: 'OP14-020', effectiveFrom: '2026-10-12', source: 'https://en.onepiece-cardgame.com/news/restriction-261001.html' },
  ],
}
