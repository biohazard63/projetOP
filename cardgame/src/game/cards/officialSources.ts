// M6 — official English review sources per card number: the set FAQ archived in docs/game/evidence/m6/sources/ (SOURCES.json).
const ST_COMBINED: Record<string, string> = { '01': '01-st-04', '02': '01-st-04', '03': '01-st-04', '04': '01-st-04', '15': '15-20', '16': '15-20', '17': '15-20', '18': '15-20', '19': '15-20', '20': '15-20', '23': '23-28', '24': '23-28', '25': '23-28', '26': '23-28', '27': '23-28', '28': '23-28' }
const DATES: Record<string, string> = {
  'qa_st-13': '20240405', 'qa_st-14': '20240802', 'qa_st-15-20': '20241011', 'qa_st-21': '20250228', 'qa_st-22': '20250822', 'qa_st-23-28': '20250530',
  'qa_st-29': '20260109', 'qa_st-30': '20260529', 'qa_st-31': '20260717', 'qa_st-32': '20260717', 'qa_st-33': '20260717', 'qa_st-34': '20260821', 'qa_st-35': '20260717',
  qa_op01: '20240405', qa_op02: '20240405', qa_op03: '20240405', qa_op04: '20240405', qa_op05: '20240405', qa_op06: '20240419', qa_op07: '20250228', qa_op08: '20240830',
  qa_op09: '20241129', qa_op10: '20250228', qa_op11: '20250523', qa_op12: '20260206', qa_op13: '20260206', qa_op14_eb04: '20260626', 'faq_op15-eb04': '20260313', qa_op16: '20260821', qa_op17: '20260821',
  qa_eb01: '20240419', qa_eb02: '20250425', qa_eb03: '20260206', qa_prb01: '20241025', qa_prb02: '20250919', 'qa_promotion-cards': '20260206',
}
/** The archived FAQ PDF that reviews this card number (throws when none is archived). */
export function faqUrlFor(number: string): string {
  const [set] = number.split('-')
  let name: string | undefined
  if (set === 'P') name = 'qa_promotion-cards'
  else if (/^ST\d{2}$/.test(set)) name = `qa_st-${ST_COMBINED[set.slice(2)] ?? set.slice(2)}`
  else if (set === 'OP14' || set === 'EB04') name = 'qa_op14_eb04'
  else if (set === 'OP15') name = 'faq_op15-eb04'
  else if (/^(OP|EB|PRB)\d{2}$/.test(set)) name = `qa_${set.toLowerCase()}`
  const date = name && DATES[name]
  if (!name || !date) throw new Error(`FAQ_SOURCE_MISSING:${number}`)
  return `https://en.onepiece-cardgame.com/pdf/${name}.pdf?${date}`
}
