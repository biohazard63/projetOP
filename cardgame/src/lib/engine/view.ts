import { getLegalActions, projectState } from '../../game/core/game'
import { effectiveStatus } from '../../game/cards/certification'
import type { GameState, LegalAction } from '../../game/core/types'
import { officialImage, type CardDisplay } from './catalog'
import type { StoredGame } from './repository'

// The only game data a browser ever receives: the engine projection for the human seat, its legal actions
// and display data of the cards this projection already names. Never the GameState, its PRNG or seed.
export type PlayerView = {
  gameId: string; version: number; status: StoredGame['status']; seat: string; opponentSeat: string; opponent: { kind: 'bot'; name: string }
  deck: string; botDeck: string; projection: ReturnType<typeof projectState>; legalActions: LegalAction[]; cards: Record<string, CardDisplay>
  // Cards the human legitimately sees outside open areas: options of its own pending choice that the legal
  // actions already name (its own looked-at deck cards), and its own Life card moving to hand with a [Trigger].
  privateCards: { options: Record<string, string>; lifeTrigger: string | null }
  botLevel: string
  // Which ability asks the pending choice, only when its source card is public or in the viewer's own hand.
  choiceSource: { name: string; number: string; text: string; trigger: boolean } | null
}
function cardsOf(state: GameState, projection: ReturnType<typeof projectState>, extra: string[]): Record<string, CardDisplay> {
  const keys = new Set<string>(extra)
  const visit = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(visit)
    else if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>
      if (typeof record.printingKey === 'string') keys.add(record.printingKey)
      Object.values(record).forEach(visit)
    }
  }
  visit(projection)
  const out: Record<string, CardDisplay> = {}
  for (const key of keys) {
    const printing = state.catalog.printings.find(p => p.printingKey === key)
    const d = printing && state.catalog.definitions.find(def => def.definitionId === printing.definitionId)
    if (!d) continue
    out[key] = { definitionId: d.definitionId, number: d.number, name: d.rulesName, category: d.category, colors: [...d.colors], cost: d.cost, power: d.power, counter: d.counter, life: d.life,
      text: d.review.effectOriginal, trigger: d.review.triggerOriginal, imageUrl: officialImage(d.number), certified: effectiveStatus(d) === 'PLAYABLE_VERIFIED' }
  }
  return out
}
function privateCards(state: GameState, seat: string, actions: LegalAction[]): PlayerView['privateCards'] {
  const options: Record<string, string> = {}
  for (const action of actions) if (action.type === 'ANSWER_CHOICE') for (const option of action.options) {
    // An option carries an instance id only when the viewer may identify it (runtime visibleOption).
    if (!('instanceId' in option) || !option.instanceId) continue
    const instance = state.instances[option.instanceId]
    if (instance?.owner === seat && instance.printingKey) options[option.instanceId] = instance.printingKey
  }
  const pending = state.battle?.pendingLifeTrigger
  const life = pending && pending.actorId === seat ? state.instances[pending.presence.instanceId] : undefined
  return { options, lifeTrigger: life?.owner === seat && life.zone === 'life' ? life.printingKey : null }
}
function choiceSource(state: GameState, seat: string): PlayerView['choiceSource'] {
  const r = state.effects
  if (!r?.choice || r.choice.actorId !== seat || !r.active) return null
  const source = r.active.context.source
  if (source.kind !== 'CARD') return null
  const instance = state.instances[source.presence.instanceId]
  const open = ['leader', 'characters', 'stage', 'trash', 'cost', 'attached'].includes(instance?.zone ?? '') || (instance?.zone === 'temporary' && instance.faceUp) || (instance?.owner === seat && instance.zone === 'hand')
  const d = state.catalog.definitions.find(def => def.definitionId === source.definitionId)
  if (!instance || !open || !d) return null
  const ability = r.registry.definitions.find(a => a.id === r.active!.definitionId)
  const trigger = ability?.timing === 'TRIGGER'
  return { name: d.rulesName, number: d.number, text: trigger ? d.review.triggerOriginal : d.review.effectOriginal, trigger }
}
export function playerView(game: StoredGame, sinceEvent = 0, botName = 'Bot Mugiwara'): PlayerView {
  const projection = projectState(game.state, game.humanSeat), legalActions = getLegalActions(game.state, game.humanSeat)
  const incremental = { ...projection, events: projection.events.filter(e => e.sequence >= sinceEvent) }
  const hidden = privateCards(game.state, game.humanSeat, legalActions)
  return { gameId: game.id, version: game.version, status: game.status, seat: game.humanSeat, opponentSeat: game.botSeat, opponent: { kind: 'bot', name: botName },
    deck: game.deckRef, botDeck: game.botDeckRef, projection: incremental, legalActions, privateCards: hidden, botLevel: game.botLevel, choiceSource: choiceSource(game.state, game.humanSeat),
    cards: cardsOf(game.state, projection, [...Object.values(hidden.options), ...(hidden.lifeTrigger ? [hidden.lifeTrigger] : [])]) }
}
