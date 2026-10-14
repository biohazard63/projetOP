import { MemoryGameRepository } from '../src/lib/engine/repository'
import { PlayService, HUMAN_SEAT } from '../src/lib/engine/service'
import { REFERENCE_DECKS } from '../src/lib/engine/decks'
import { botDecision } from '../src/lib/engine/strategy'
import { cardActions, seats, type Visible } from '../src/components/play/model'
import type { View } from '../src/components/play/api'

/** Finds a real Counter window by playing valid commands. Never mutates engine state or uses a database. */
export async function counterFixture(category: 'CHARACTER' | 'EVENT') {
  for (const deck of REFERENCE_DECKS) for (const seed of [11, 23, 35, 47]) {
    const repo = new MemoryGameRepository(), play = new PlayService(repo, () => seed), uid = `feel-${deck.id}-${seed}`
    let view = await play.start(uid, { ref: deck.id, entries: structuredClone(deck.entries) }, 'hard') as View
    for (let n = 0; n < 250 && view.status === 'ACTIVE'; n++) {
      const counter = ((seats(view).me.hand ?? []) as Visible[]).flatMap(c => cardActions(view, c.id).map(action => ({ action, card: view.cards[c.printingKey ?? ''] }))).sort((a,b) => Number(b.action.key === 'event-don') - Number(a.action.key === 'event-don')).find(({ action, card }) => card?.category === category && action.intent?.type === (category === 'CHARACTER' ? 'PLAY_COUNTER_CHARACTER' : 'PLAY_COUNTER_EVENT'))
      if (counter?.action.intent) return { repo, play, uid, view, intent: counter.action.intent, card: counter.card, label: `${counter.card.name} : ${counter.action.label}`, seed, deck: deck.id }
      const { intent } = botDecision(repo.games.get(view.gameId)!.state, HUMAN_SEAT, 'hard')
      view = (await play.command(uid, view.gameId, { id: `scan-${view.version}`, expectedVersion: view.version, intent })).view as View
    }
  }
  throw new Error(`No real ${category} Counter fixture found`)
}
