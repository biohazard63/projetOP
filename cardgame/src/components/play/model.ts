import type { View } from './api'
import type { CardDisplay } from '@/lib/engine/catalog'
import type { LegalAction } from '@/game/core/types'

// Pure helpers turning a PlayerView into what the board shows and offers. Every offered intent is built from
// a legal action of the view; the engine on the server remains the only judge of legality.
export type Intent = Record<string, unknown> & { type: string }
export type Visible = { id: string; kind: string; printingKey: string | null; definitionId: string | null; rested: boolean; attachedTo: string | null; power: number | null }
export type Seat = View['projection']['players'][number]
export type CardAction = { key: string; label: string; intent?: Intent; targets?: { label: string; ids: string[]; build: (targetId: string) => Intent }; tone?: 'primary' | 'danger' | 'neutral' }

const of = <T extends LegalAction['type']>(view: View, type: T) => view.legalActions.filter((a): a is Extract<LegalAction, { type: T }> => a.type === type)
export const seats = (view: View) => ({ me: view.projection.players.find(p => p.id === view.seat)!, foe: view.projection.players.find(p => p.id === view.opponentSeat)! })
export const display = (view: View, printingKey: string | null | undefined): CardDisplay | undefined => printingKey ? view.cards[printingKey] : undefined
export function findVisible(view: View, id: string): Visible | undefined {
  for (const p of view.projection.players) for (const zone of [p.leader, p.characters, p.stage, p.trash, p.cost, p.attached, p.hand ?? []] as Visible[][]) {
    const found = zone.find(v => v.id === id)
    if (found) return found
  }
  return undefined
}
export function cardName(view: View, id: string): string {
  const visible = findVisible(view, id)
  const key = visible?.printingKey ?? view.privateCards.options[id]
  return display(view, key)?.name ?? 'Carte cachée'
}
/** effectId = `${abilityId}:${instanceId}:${generation}`; instance ids themselves contain colons. */
export function parseEffectId(effectId: string): { abilityId: string; instanceId: string } {
  const first = effectId.indexOf(':'), last = effectId.lastIndexOf(':')
  return { abilityId: effectId.slice(0, first), instanceId: effectId.slice(first + 1, last) }
}
export const attachedCount = (seat: Seat, id: string) => (seat.attached as Visible[]).filter(d => d.attachedTo === id).length
// Field DON!! for a DON!! −X cost: rested ones first, then active, then given ones (a player choice the UI makes explicit).
function donMinusOrder(seat: Seat, eligible: string[]) {
  const cost = seat.cost as Visible[]
  return [...eligible.filter(id => cost.find(d => d.id === id)?.rested), ...eligible.filter(id => cost.some(d => d.id === id && !d.rested)), ...eligible.filter(id => !cost.some(d => d.id === id))]
}

export function cardActions(view: View, instanceId: string): CardAction[] {
  const { me } = seats(view), out: CardAction[] = [], name = (id: string) => cardName(view, id)
  for (const play of of(view, 'PLAY_CARD').filter(a => a.instanceId === instanceId)) {
    const intent = (replaceId: string | null): Intent => ({ type: 'PLAY_CARD', instanceId, donIds: play.eligibleDonIds.slice(0, play.cost), replaceId })
    out.push(play.requiresReplacement
      ? { key: 'play', label: `Jouer (coût ${play.cost}) en remplaçant…`, tone: 'primary', targets: { label: 'Personnage à remplacer', ids: play.replacementIds, build: intent } }
      : { key: 'play', label: `Jouer (coût ${play.cost})`, tone: 'primary', intent: intent(null) })
  }
  for (const start of of(view, 'START_EFFECT').filter(a => parseEffectId(a.effectId).instanceId === instanceId)) {
    if (start.donMinus) {
      const ids = donMinusOrder(me, start.donMinus.eligibleDonIds).slice(0, start.donMinus.amount)
      out.push({ key: start.effectId, label: `Activer : renvoyer ${start.donMinus.amount} DON!!`, tone: 'primary', intent: { type: 'START_EFFECT', effectId: start.effectId, donMinusIds: ids } })
    } else if (start.optionalCost === 'TAKE_TOP_LIFE_TO_HAND') {
      out.push({ key: `${start.effectId}:life`, label: 'Activer en ajoutant 1 Vie à la main', tone: 'primary', intent: { type: 'START_EFFECT', effectId: start.effectId, payOptionalCost: true } })
      out.push({ key: start.effectId, label: 'Activer sans payer de Vie (sans effet)', intent: { type: 'START_EFFECT', effectId: start.effectId } })
    } else out.push({ key: start.effectId, label: 'Activer l’effet', tone: 'primary', intent: { type: 'START_EFFECT', effectId: start.effectId } })
  }
  for (const attack of of(view, 'DECLARE_ATTACK').filter(a => a.attackerIds.includes(instanceId))) {
    const targets = attack.targetIdsByAttacker?.[instanceId] ?? attack.targetIds
    out.push({ key: 'attack', label: 'Attaquer', tone: 'primary', targets: { label: 'Cible de l’attaque', ids: targets, build: targetId => ({ type: 'DECLARE_ATTACK', attackerId: instanceId, targetId }) } })
  }
  for (const attach of of(view, 'ATTACH_DON').filter(a => a.targetIds.includes(instanceId) && a.eligibleDonIds.length)) {
    out.push({ key: 'attach', label: `Donner 1 DON!! (${attach.eligibleDonIds.length} disponibles)`, intent: { type: 'ATTACH_DON', donIds: attach.eligibleDonIds.slice(0, 1), targetId: instanceId } })
  }
  for (const block of of(view, 'ACTIVATE_BLOCKER').filter(a => a.blockerIds.includes(instanceId))) {
    out.push({ key: 'block', label: 'Bloquer avec ce Personnage', tone: 'primary', intent: { type: 'ACTIVATE_BLOCKER', blockerId: instanceId, battleId: block.battleId } })
  }
  const battle = view.projection.battle
  for (const counter of of(view, 'PLAY_COUNTER_CHARACTER').filter(a => a.cardIds.includes(instanceId))) {
    const value = display(view, findVisible(view, instanceId)?.printingKey)?.counter ?? 0
    const build = (targetId: string): Intent => ({ type: 'PLAY_COUNTER_CHARACTER', cardId: instanceId, targetId, battleId: counter.battleId })
    out.push(battle && counter.targetIds.includes(battle.target)
      ? { key: 'counter', label: `Counter +${value} sur ${name(battle.target)}`, tone: 'primary', intent: build(battle.target) }
      : { key: 'counter', label: `Counter +${value}`, tone: 'primary', targets: { label: 'Carte à renforcer', ids: counter.targetIds, build } })
  }
  for (const event of of(view, 'PLAY_COUNTER_EVENT').filter(a => a.eventIds.includes(instanceId))) {
    const card = display(view, findVisible(view, instanceId)?.printingKey), pay = event.paymentDonIds.slice(0, card?.cost ?? 0)
    const base: Intent = { type: 'PLAY_COUNTER_EVENT', cardId: instanceId, battleId: event.battleId, paymentDonIds: pay, donMinusIds: [], targetId: null }
    // UI hints from the reviewed card text; the server engine validates every optional cost.
    if (card && /DON!! −1/.test(card.text)) out.push({ key: 'event-don', label: 'Jouer le Counter avec DON!! −1', tone: 'primary', intent: { ...base, donMinusIds: [pay[0] ?? event.donMinusIds[0]] } })
    if (card && /top of your Life cards to your hand/.test(card.text) && me.counts.life > 0) out.push({ key: 'event-life', label: 'Jouer le Counter en ajoutant 1 Vie à la main', tone: 'primary', intent: { ...base, lifePayment: true } })
    out.push({ key: 'event', label: card && /DON!! −1|top of your Life cards/.test(card.text) ? 'Jouer sans coût facultatif (sans effet)' : 'Jouer le Counter', intent: base })
  }
  return out
}

export type Prompt =
  | { kind: 'first' } | { kind: 'mulligan' } | { kind: 'choice'; action: Extract<LegalAction, { type: 'ANSWER_CHOICE' }> } | { kind: 'trigger'; choiceId: string }
  | { kind: 'block'; battleId: string; blockers: string[] } | { kind: 'counter'; battleId: string } | { kind: 'resolve'; battleId: string } | { kind: 'continue'; battleId: string }
  | { kind: 'main' } | { kind: 'advance' } | { kind: 'wait' } | { kind: 'over' }
/** The decision window the human is in, from its legal actions only. */
export function prompt(view: View): Prompt {
  if (view.status === 'FINISHED' || view.projection.result) return { kind: 'over' }
  const a = view.legalActions
  const choice = of(view, 'ANSWER_CHOICE')[0]
  if (choice) return { kind: 'choice', action: choice }
  if (of(view, 'CHOOSE_FIRST')[0]) return { kind: 'first' }
  if (of(view, 'MULLIGAN')[0]) return { kind: 'mulligan' }
  const trigger = of(view, 'ANSWER_TRIGGER')[0]
  if (trigger) return { kind: 'trigger', choiceId: trigger.choiceId }
  const pass = of(view, 'PASS_BLOCKER')[0]
  if (pass) return { kind: 'block', battleId: pass.battleId, blockers: of(view, 'ACTIVATE_BLOCKER')[0]?.blockerIds ?? [] }
  const counter = of(view, 'PASS_COUNTER')[0]
  if (counter) return { kind: 'counter', battleId: counter.battleId }
  const resolve = of(view, 'RESOLVE_BATTLE')[0]
  if (resolve) return { kind: 'resolve', battleId: resolve.battleId }
  const resume = of(view, 'CONTINUE_LIFE_DAMAGE')[0]
  if (resume) return { kind: 'continue', battleId: resume.battleId }
  if (a.some(x => x.type === 'END_MAIN')) return { kind: 'main' }
  if (a.length === 1 && a[0].type === 'ADVANCE_PHASE') return { kind: 'advance' }
  return { kind: 'wait' }
}
export type FeedItem = { sequence: number; text: string; mine: boolean }
export function feed(view: View, after: number, label: (type: string, mine: boolean) => string | null): FeedItem[] {
  return view.projection.events.filter(e => e.sequence > after).flatMap(e => {
    const mine = e.actorId === view.seat, text = label(e.type, mine)
    return text ? [{ sequence: e.sequence, text, mine }] : []
  })
}

// ---------- M5-3 drag and drop: a drop becomes an intent only if a legal action allows it ----------
export type DropSource = { kind: 'hand' | 'don' | 'attacker'; id: string }
export const FIELD_DROP = 'field:me'
export function dropIntent(view: View, source: DropSource, targetId: string): Intent | null {
  if (source.kind === 'hand') {
    const play = of(view, 'PLAY_CARD').find(a => a.instanceId === source.id)
    if (play && targetId === FIELD_DROP && !play.requiresReplacement) return { type: 'PLAY_CARD', instanceId: source.id, donIds: play.eligibleDonIds.slice(0, play.cost), replaceId: null }
    if (play && play.requiresReplacement && play.replacementIds.includes(targetId)) return { type: 'PLAY_CARD', instanceId: source.id, donIds: play.eligibleDonIds.slice(0, play.cost), replaceId: targetId }
    const counter = of(view, 'PLAY_COUNTER_CHARACTER').find(a => a.cardIds.includes(source.id))
    if (counter && (counter.targetIds.includes(targetId) || (targetId === FIELD_DROP && view.projection.battle && counter.targetIds.includes(view.projection.battle.target))))
      return { type: 'PLAY_COUNTER_CHARACTER', cardId: source.id, targetId: targetId === FIELD_DROP ? view.projection.battle!.target : targetId, battleId: counter.battleId }
    return null
  }
  if (source.kind === 'don') {
    const attach = of(view, 'ATTACH_DON')[0]
    return attach && attach.eligibleDonIds.includes(source.id) && attach.targetIds.includes(targetId) ? { type: 'ATTACH_DON', donIds: [source.id], targetId } : null
  }
  const attack = of(view, 'DECLARE_ATTACK')[0]
  const targets = attack && attack.attackerIds.includes(source.id) ? (attack.targetIdsByAttacker?.[source.id] ?? attack.targetIds) : []
  return targets.includes(targetId) ? { type: 'DECLARE_ATTACK', attackerId: source.id, targetId } : null
}
/** Can this card start a drag right now (only when a legal action could follow)? */
export function draggable(view: View, kind: DropSource['kind'], id: string): boolean {
  if (kind === 'hand') return of(view, 'PLAY_CARD').some(a => a.instanceId === id) || of(view, 'PLAY_COUNTER_CHARACTER').some(a => a.cardIds.includes(id))
  if (kind === 'don') return !!of(view, 'ATTACH_DON')[0]?.eligibleDonIds.includes(id)
  return !!of(view, 'DECLARE_ATTACK')[0]?.attackerIds.includes(id)
}
/** Attacks still available when the player ends the turn (asks for a confirmation). */
export const pendingAttacks = (view: View) => of(view, 'DECLARE_ATTACK')[0]?.attackerIds.length ?? 0
