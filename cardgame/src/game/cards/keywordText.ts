// Printed combat keywords and their official reminder text. A card text made only of these is executable through
// review.combatKeywords (no separate ability program). Any other word keeps the text unexecutable.
const KEYWORD_TEXT: Record<string, RegExp> = {
  RUSH: /\[Rush\]\s*(\(This card can attack on the turn in which it is played\.\))?/gi,
  DOUBLE_ATTACK: /\[Double Attack\]\s*(\(This card deals 2 damage\.\))?/gi,
  BANISH: /\[Banish\]\s*(\(When this card deals damage, the target card is trashed without activating its Trigger\.\))?/gi,
}
/** True when the printed text consists only of the given keywords and their official reminder text. */
export function keywordOnlyText(text: string, keywords: readonly string[]): boolean {
  if (!keywords.length) return false
  let rest = text
  for (const k of keywords) { const re = KEYWORD_TEXT[k]; if (!re) return false; rest = rest.replace(re, ' ') }
  return rest.replace(/\s+/g, '') === ''
}
