import type { CardInput } from './types'
import { localCard, type LocalProfile, type LocalRow } from './localCards'
import { OFFICIAL_EN_ROWS } from './officialRows'
import { faqUrlFor } from './officialSources'

// M6 cards reviewed from an official English card list snapshot (data/official-en, archived page in
// docs/game/evidence/m6/sources/cardlist-en/) because the local cardJson has no English text for them, or because the
// local row disagrees with the official page. One revision for all of them.
export const OFFICIAL_REVISION = 'm6-official-en-2026-10-14'
export const officialDefinitionId = (number: string) => `${number}@${OFFICIAL_REVISION}`
/** The base printing (id = number) of `number` in the snapshot `label`, else its first printing on that page. */
export function officialRow(label: string, number: string): LocalRow {
  const rows = OFFICIAL_EN_ROWS[label] ?? []
  const row = rows.find(r => (r as LocalRow & { id?: string }).id === number) ?? rows.find(r => r.code === number)
  if (!row) throw new Error(`OFFICIAL_CARD_MISSING:${label}:${number}`)
  return row
}
export function officialCard(label: string, number: string, profile: LocalProfile): CardInput {
  return localCard(officialRow(label, number), label, `cardgame/data/official-en/cards-${label}.json`, OFFICIAL_REVISION, faqUrlFor(number), '2026-10-14', profile)
}
