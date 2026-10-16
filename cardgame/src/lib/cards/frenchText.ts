import { createHash } from 'node:crypto'
import OFFICIAL from '@/game/cards/display-fr.json'
import UNOFFICIAL from './translations-fr.json'

// French texts shown to players, server side only (the official file is too large for the client). Display only: the
// rules engine and the bot keep reading the card definitions and the original text, which are never replaced.
export type TextSource = 'official' | 'unofficial'
export type FrenchText = { effect: string | null; trigger: string | null; source: TextSource }
type Official = Record<string, { text: string; trigger: string }>
type Unofficial = { cards: Record<string, { effect?: string; trigger?: string; en: string }> }

/** Card number of a printing (alternate arts share the standard printing's number). */
export const cardNumber = (card: { id: string; code?: string | null }) => (card.code || card.id).replace(/_.*$/, '').toUpperCase()
const clean = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim()
/** Fingerprint of the English texts a translation was made from. */
export const englishFingerprint = (effect: string | null | undefined, trigger: string | null | undefined) => createHash('sha256').update(`${clean(effect)}\n${clean(trigger)}`).digest('hex').slice(0, 16)

/**
 * The official French printing first (each text block only when it exists in both languages, so no ability is hidden or
 * invented by the swap), then a reviewed unofficial translation of exactly this English text; null keeps the original.
 */
export function frenchText(card: { id: string; code?: string | null; effect?: string | null; trigger?: string | null }): FrenchText | null {
  const number = cardNumber(card), effect = clean(card.effect), trigger = clean(card.trigger)
  if (!effect && !trigger) return null
  const official = (OFFICIAL as Official)[number]
  if (official && !!clean(official.text) === !!effect && !!clean(official.trigger) === !!trigger) {
    if (clean(official.text) === effect && clean(official.trigger) === trigger) return null // already French
    return { effect: clean(official.text) || null, trigger: clean(official.trigger) || null, source: 'official' }
  }
  return unofficialText(number, effect, trigger)
}
/** The unofficial translation of exactly this English text (same blocks, same fingerprint), if any. */
export function unofficialText(number: string, effect: string | null | undefined, trigger: string | null | undefined): FrenchText | null {
  const unofficial = (UNOFFICIAL as Unofficial).cards[number]
  if (!unofficial || unofficial.en !== englishFingerprint(effect, trigger) || !!unofficial.effect !== !!clean(effect) || !!unofficial.trigger !== !!clean(trigger)) return null
  return { effect: unofficial.effect ?? null, trigger: unofficial.trigger ?? null, source: 'unofficial' }
}
