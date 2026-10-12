import type { CardDefinition, CardPrinting } from '../cards/types'
export type Restriction = { kind: 'banned'; number: string; effectiveFrom: string; source: string } | { kind: 'limited'; number: string; limit: number; effectiveFrom: string; source: string } | { kind: 'pair'; numbers: [string, string]; effectiveFrom: string; source: string }
// format OFFICIAL_SUBSET (default): an official restriction snapshot valid inside its window. format FREE: a permanent
// Mugiwara format with no official ban list and no window; every structural rule (CR §5-1-2) still applies.
export type RulesetFormat = 'OFFICIAL_SUBSET' | 'FREE'
export type Ruleset = { id: string; format?: RulesetFormat; date: string; rulesVersion: string; competitive: boolean; restrictionWindow: { from: string; through: string } | null; restrictions: Restriction[]; allowedNumbers: string[]; capabilities: string[]; allowedBlocks?: string[] }
export type DeckEntry = { printingKey: string; quantity: number }
// Composition mode validates data only; it must never authorize launching a game.
export function validateEngineDeck(entries: DeckEntry[], definitions: CardDefinition[], printings: CardPrinting[], ruleset: Ruleset, mode: 'playable' | 'composition' = 'playable'): string[] {
  const errors: string[] = []
  if (ruleset.format === 'FREE') {
    // A free format is permanent only if it carries no official element that could expire or need re-reading.
    if (ruleset.restrictionWindow !== null || ruleset.restrictions.length || ruleset.competitive || ruleset.allowedBlocks) errors.push('INVALID_FREE_FORMAT')
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(ruleset.date) || !ruleset.restrictionWindow || ruleset.date < ruleset.restrictionWindow.from || ruleset.date > ruleset.restrictionWindow.through) errors.push('RESTRICTIONS_OUT_OF_DATE')
  if (ruleset.competitive && !ruleset.allowedBlocks) errors.push('FORMAT_NOT_VERIFIED')
  const byId = new Map(definitions.map(d => [d.definitionId, d]))
  const byPrinting = new Map(printings.map(p => [p.printingKey, p]))
  const resolved: { definition: CardDefinition; quantity: number }[] = []
  for (const entry of entries) {
    if (!Number.isSafeInteger(entry.quantity) || entry.quantity < 1) { errors.push('INVALID_QUANTITY'); continue }
    const printing = byPrinting.get(entry.printingKey)
    const definition = printing && byId.get(printing.definitionId)
    if (!definition) { errors.push(`UNKNOWN_PRINTING:${entry.printingKey}`); continue }
    if (!ruleset.allowedNumbers.includes(definition.number)) errors.push(`NOT_ADMITTED:${definition.number}`)
    if (mode === 'playable' && definition.review.requiredCapabilities.some(c => !ruleset.capabilities.includes(c))) errors.push(`UNSUPPORTED_EFFECT:${definition.number}`)
    if (ruleset.allowedBlocks && (!definition.block || !ruleset.allowedBlocks.includes(definition.block))) errors.push(`BLOCK_NOT_ALLOWED:${definition.number}`)
    resolved.push({ definition, quantity: entry.quantity })
  }
  const leaders = resolved.filter(r => r.definition.category === 'LEADER')
  if (leaders.reduce((n, r) => n + r.quantity, 0) !== 1) errors.push('EXACTLY_ONE_LEADER')
  const main = resolved.filter(r => r.definition.category !== 'LEADER')
  if (main.reduce((n, r) => n + r.quantity, 0) !== 50) errors.push('EXACTLY_FIFTY_MAIN')
  if (main.some(r => !['CHARACTER', 'EVENT', 'STAGE'].includes(r.definition.category))) errors.push('INVALID_MAIN_CATEGORY')
  const leader = leaders[0]?.definition
  if (leader && main.some(r => r.definition.colors.some(c => !leader.colors.includes(c)))) errors.push('INCOMPATIBLE_COLOR')
  const counts = new Map<string, number>()
  for (const { definition, quantity } of resolved) counts.set(definition.number, (counts.get(definition.number) || 0) + quantity)
  for (const [number, count] of counts) if (count > 4) errors.push(`TOO_MANY_COPIES:${number}`)
  for (const restriction of ruleset.restrictions.filter(r => r.effectiveFrom <= ruleset.date)) {
    if (restriction.kind === 'pair') {
      if (restriction.numbers.every(n => counts.has(n))) errors.push(`BANNED_PAIR:${restriction.numbers.join('+')}`)
    } else if ((counts.get(restriction.number) || 0) > (restriction.kind === 'banned' ? 0 : restriction.limit)) errors.push(`RESTRICTED:${restriction.number}`)
  }
  return [...new Set(errors)]
}
