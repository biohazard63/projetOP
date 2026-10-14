import { combatPresentation, type CombatPresentation } from './combatPresentation'
import type { View } from './api'
import { cardName, display, findVisible, seats, type Visible } from './model'
import { ANIMATION_DURATIONS, type AnimKind } from './presentationTiming'

// M5-2 — presentation of CONFIRMED server events. Steps are derived from events with a sequence greater than the
// last one already shown, plus visible differences between two views (power, DON!! rested). They are purely
// visual: nothing here changes or predicts the game. Hidden cards stay hidden (no instance id or face is shown
// for a card the viewer cannot see: draws and Life cards are shown face down).
export type { AnimKind } from './presentationTiming'
export type AnimStep = { key: string; kind: AnimKind; mine: boolean; text: string; cards: (string | null)[]; ids: string[]; duration: number
  faces?: (View['cards'][string] | null)[]; counter?: { category: 'CHARACTER' | 'EVENT'; value: number | null }; battleId?: string; combat?: CombatPresentation }
export type LogEntry = { sequence: number; mine: boolean; text: string }
type Event = View['projection']['events'][number] & { revealedCard?: { printingKey: string } }

function printingOf(view: View, id: string | undefined): string | null {
  if (!id) return null
  return findVisible(view, id)?.printingKey ?? null
}
function nameOf(view: View, id: string | undefined) { return id ? cardName(view, id) : '' }

/** Readable French journal line for one confirmed event (cards named only when public). */
export function logText(view: View, e: Event): string | null {
  const mine = e.actorId === view.seat, who = mine ? 'Vous' : 'L’adversaire', card = e.publicInstanceId ? nameOf(view, e.publicInstanceId) : ''
  switch (e.type) {
    case 'DRAWN': return mine ? 'Vous piochez une carte' : 'L’adversaire pioche une carte'
    case 'ORDER_CHOSEN': return mine ? 'Vous choisissez l’ordre de jeu' : 'L’adversaire choisit l’ordre de jeu'
    case 'HAND_KEPT': return mine ? 'Vous gardez votre main' : 'L’adversaire garde sa main'
    case 'DRAW_SKIPPED': return mine ? 'Premier tour : vous ne piochez pas' : 'Premier tour : l’adversaire ne pioche pas'
    case 'DON_ADDED': return mine ? 'Vous recevez des DON!!' : 'L’adversaire reçoit des DON!!'
    case 'CARD_PLAYED': return `${who} ${mine ? 'jouez' : 'joue'} ${card || 'une carte'}`
    case 'CARD_REVEALED': return e.revealedCard ? `Carte révélée : ${display(view, e.revealedCard.printingKey)?.name ?? 'carte'}` : null
    case 'DON_ATTACHED': return mine ? 'Vous donnez un DON!!' : 'L’adversaire donne un DON!!'
    case 'ATTACK_DECLARED': return `${who} ${mine ? 'attaquez' : 'attaque'} avec ${card || 'une carte'}`
    case 'BLOCKER_ACTIVATED': return `${card || 'Un Personnage'} bloque l’attaque`
    case 'COUNTER_PLAYED': return `${who} ${mine ? 'jouez' : 'joue'} un Counter${card ? ` : ${card}` : ''}`
    case 'LIFE_DAMAGED': return mine ? 'Vous perdez une carte de Vie' : 'L’adversaire perd une carte de Vie'
    case 'LIFE_PAID': return mine ? 'Vous ajoutez une Vie à votre main' : 'L’adversaire ajoute une Vie à sa main'
    case 'LIFE_TRASHED': return mine ? 'Une de vos Vies est défaussée' : 'Une Vie adverse est défaussée'
    case 'LIFE_TURNED_FACE_UP': return mine ? 'Une de vos Vies est retournée face visible' : 'Une Vie adverse est retournée face visible'
    case 'LIFE_TO_DECK': return mine ? 'Une de vos Vies est placée sur votre deck' : 'Une Vie adverse est placée sur son deck'
    case 'LIFE_TO_HAND': return mine ? 'Vous ajoutez une Vie à votre main' : 'L’adversaire ajoute une Vie à sa main'
    case 'LIFE_ADDED': return mine ? 'Une carte rejoint vos Vies' : 'Une carte rejoint les Vies adverses'
    case 'TRIGGER_ACTIVATED': return `[Trigger] ${card || ''}`.trim()
    case 'CHARACTER_KO': return `${card || 'Un Personnage'} est mis K.O.`
    case 'CARD_TRASHED': return `${card || 'Une carte'} va à la défausse`
    case 'BATTLE_RESOLVED': return 'Combat terminé'
    case 'TURN_ENDED': return mine ? 'Fin de votre tour' : 'Fin du tour adverse'
    case 'HAND_REDRAWN': return mine ? 'Vous repiochez votre main' : 'L’adversaire repioche sa main'
    case 'GAME_ENDED': return 'Fin de la partie'
    default: return null
  }
}
export function journal(view: View, after = -1): LogEntry[] {
  return (view.projection.events as Event[]).filter(e => e.sequence > after).flatMap(e => { const text = logText(view, e); return text ? [{ sequence: e.sequence, mine: e.actorId === view.seat, text }] : [] })
}

function step(kind: AnimKind, key: string, mine: boolean, text: string, cards: (string | null)[], ids: string[]): AnimStep { return { key, kind, mine, text, cards, ids, duration: ANIMATION_DURATIONS[kind] } }

/** Animation steps for what changed between `prev` (already shown) and `next`. Bot steps keep their order. */
export function animationSteps(prev: View | null, next: View, after: number): AnimStep[] {
  if (prev?.gameId !== next.gameId) prev = null
  const steps: AnimStep[] = []
  const events = (next.projection.events as Event[]).filter(e => e.sequence > after).sort((a, b) => a.sequence - b.sequence)
  const disclosed = new Map<string, string>()
  for (const e of events) {
    const mine = e.actorId === next.seat, id = e.publicInstanceId, key = `e${e.sequence}`
    if (id && e.revealedCard) disclosed.set(id, e.revealedCard.printingKey)
    const face = printingOf(next, id) ?? (prev ? printingOf(prev, id) : null) ?? (id ? disclosed.get(id) : null) ?? null
    const shown = face ? display(next, face) ?? (prev ? display(prev, face) : null) : null
    const name = shown?.name ?? (id ? nameOf(next, id) : 'Une carte')
    switch (e.type) {
      case 'DRAWN': steps.push(step('draw', key, mine, mine ? 'Pioche' : 'L’adversaire pioche', [null], [])); break
      case 'DON_ADDED': steps.push(step('don-add', key, mine, 'DON!! disponibles', [], [])); break
      case 'CARD_PLAYED': steps.push(step('play', key, mine, `${mine ? 'Vous jouez' : 'L’adversaire joue'} ${name}`, [face], id ? [id] : [])); break
      case 'DON_ATTACHED': steps.push(step('don-attach', key, mine, 'DON!! donné', [], id ? [id] : [])); break
      case 'ATTACK_DECLARED': {
        // A finished/grouped battle does not expose its original target. Never substitute its final Blocker as the declared target.
        const battle = next.projection.battle, target = battle && battle.step === 'BLOCKER' && battle.attacker === id ? battle.target : undefined
        steps.push(step('attack', key, mine, `${name} attaque${target ? ` ${nameOf(next, target)}` : ''}`, [face, target ? printingOf(next, target) : null], [id, target].filter((x): x is string => !!x))); break
      }
      case 'BLOCKER_ACTIVATED': steps.push(step('block', key, mine, `${name} bloque !`, [face], id ? [id] : [])); break
      case 'COUNTER_PLAYED': {
        const current = step('counter', key, mine, `${shown?.category === 'EVENT' ? 'Événement de contre' : 'Counter'}${shown ? ` : ${name}` : ' utilisé'}`, [face], id ? [id] : [])
        if (shown?.category === 'EVENT' || shown?.category === 'CHARACTER') current.counter = { category: shown.category, value: shown.category === 'CHARACTER' ? shown.counter : null }
        if (next.projection.battle && prev?.projection.battle?.id === next.projection.battle.id) current.battleId = next.projection.battle.id
        steps.push(current); break
      }
      case 'BATTLE_RESOLVED': {
        const result = combatPresentation(prev, next, e.sequence)
        const current = step('combat', key, mine, result.outcome === 'ATTACK' ? 'Attaque réussie' : result.outcome === 'DEFENCE' ? 'Défense réussie' : result.outcome === 'INTERRUPTED' ? 'Combat interrompu' : result.outcome === 'PRESERVED' ? 'Cible préservée' : 'Combat terminé', [], [])
        current.combat = result; steps.push(current); break
      }
      case 'LIFE_DAMAGED': steps.push(step('life', key, mine, mine ? '−1 Vie' : 'L’adversaire perd une Vie', [null], [])); break
      case 'LIFE_TRASHED': steps.push(step('life', key, mine, mine ? 'Vie défaussée' : 'Vie adverse défaussée', [null], [])); break
      case 'TRIGGER_ACTIVATED': steps.push(step('trigger', key, mine, `[Trigger] ${name}`, [face], id ? [id] : [])); break
      case 'CHARACTER_KO': steps.push(step('ko', key, mine, `${name} K.O.`, [face], id ? [id] : [])); break
      case 'CARD_TRASHED': if (face) steps.push(step('trash', key, mine, `${name} → défausse`, [face], id ? [id] : [])); break
      case 'TURN_ENDED': steps.push(step('turn', key, mine, mine ? 'Tour adverse' : 'À vous de jouer', [], [])); break
      case 'GAME_ENDED': {
        const result = next.projection.result as { winnerId: string | null } | null
        steps.push(step('result', key, mine, result?.winnerId === next.seat ? 'Victoire !' : 'Défaite', [], [])); break
      }
    }
  }
  // Ability activations are effect-runtime events (public card events).
  const cardEvents = ((next.projection as unknown as { effects?: { cardEvents?: { type: string; subjectId: string; sequence: number; controllerId: string }[] } }).effects?.cardEvents ?? [])
  const seenAbilities = prev ? new Set(((prev.projection as unknown as { effects?: { cardEvents?: { sequence: number }[] } }).effects?.cardEvents ?? []).map(c => c.sequence)) : null
  for (const c of cardEvents) if (c.type === 'ABILITY_ACTIVATED' && seenAbilities && !seenAbilities.has(c.sequence)) {
    const face = printingOf(next, c.subjectId)
    if (face) steps.push(step('ability', `a${c.sequence}`, c.controllerId === next.seat, `Capacité appliquée : ${nameOf(next, c.subjectId)}`, [face], [c.subjectId]))
  }
  if (prev) {
    // Visible power changes (Counters, effects) and DON!! that became rested (payments).
    for (const p of next.projection.players) for (const v of [...p.leader, ...p.characters] as Visible[]) {
      const before = findVisible(prev, v.id)
      if (before && before.power !== null && v.power !== null && v.power > before.power) steps.push(step('power', `p${next.version}:${v.id}:${v.power}`, p.id === next.seat, `${nameOf(next, v.id)} +${v.power - before.power}`, [], [v.id]))
    }
    const battle = next.projection.battle, prevBattle = prev.projection.battle
    if (battle && prevBattle && battle.id === prevBattle.id && (battle.counterBonus ?? 0) > (prevBattle.counterBonus ?? 0) && !steps.some(s => s.kind === 'counter')) steps.push(step('power', `cb${battle.id}${battle.counterBonus}`, battle.defenderId === next.seat, `${nameOf(next, battle.target)} +${(battle.counterBonus ?? 0) - (prevBattle.counterBonus ?? 0)}`, [], [battle.target]))
    const rested = (v: View) => seats(v).me.cost.filter(d => (d as Visible).rested).length
    if (rested(next) > rested(prev) && !steps.some(s => s.mine && s.kind === 'play')) steps.push(step('don-rest', `r${next.version}`, true, 'DON!! reposés', [], []))
  }
  // Snapshot only display data already disclosed by a projection. Later views can remove the source from trash/field.
  return steps.map(current => ({ ...current, faces: current.cards.map(key => {
    const card = key ? display(next, key) ?? (prev ? display(prev, key) : null) : null
    return card ? { ...card } : null
  }) }))
}
export const lastSequence = (view: View) => view.projection.events.at(-1)?.sequence ?? -1
