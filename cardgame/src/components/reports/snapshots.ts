import type { CatalogueCard } from '@/lib/collector/types'
import type { OpeningCard } from '@/lib/boosters/types'
import type { CardDisplay } from '@/lib/engine/catalog'
import type { PlayerView } from '@/lib/engine/view'
import { cardSnapshot, type ReportCard, type ReportContext } from '@/lib/reports/service'

export function boosterReportCard(card: OpeningCard, shown?: { effect: string | null; trigger: string | null; source: string | null; original: boolean }): ReportCard {
  return cardSnapshot.parse({ ...card, imageUrl: card.imageUrl || null, displayedEffect: shown?.effect, displayedTrigger: shown?.trigger, textSource: shown?.source, originalShown: shown?.original })
}
export function playReportCard(card: CardDisplay, printingKey?: string | null, visible?: { power: number | null; rested: boolean }, originalShown = false): ReportCard {
  const shown = originalShown && card.original ? card.original : card
  return cardSnapshot.parse({ ...card, printingKey: printingKey ?? undefined, code: card.number, type: card.category, effect: card.text, originalText: card.original?.text, originalTrigger: card.original?.trigger, currentPower: visible?.power ?? card.power, rested: visible?.rested, displayedEffect: shown.text, displayedTrigger: shown.trigger, originalShown, textSource: card.translation ?? card.language })
}
export function playReportContext(view: PlayerView): ReportContext {
  return { pathname: '/play', gameId: view.gameId, turn: view.projection.turn, version: view.version, phase: view.projection.phase, events: view.projection.events.slice(-20).map(e => ({ type: e.type, sequence: e.sequence })) }
}

export function collectionReportCard(card: CatalogueCard, shown: { effect: string | null; trigger: string | null; source: string | null; original: boolean }): ReportCard {
  return cardSnapshot.parse({ ...card, imageUrl: card.imageUrl || null, isAltArt: card.isAltArt ?? undefined, isParallel: card.isParallel ?? undefined, isSpecial: card.isSpecial ?? undefined, displayedEffect: shown.effect, displayedTrigger: shown.trigger, textSource: shown.source, originalShown: shown.original })
}
