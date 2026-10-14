import type { View } from './api'
import { cardName, display, findVisible, seats, type Visible } from './model'

// M5-2 — presentation of CONFIRMED server events. Steps are derived from events with a sequence greater than the
// last one already shown, plus visible differences between two views (power, DON!! rested). They are purely
// visual: nothing here changes or predicts the game. Hidden cards stay hidden (no instance id or face is shown
// for a card the viewer cannot see: draws and Life cards are shown face down).
export type AnimKind = 'draw' | 'play' | 'don-attach' | 'don-rest' | 'attack' | 'block' | 'counter' | 'power' | 'life' | 'trigger' | 'ko' | 'trash' | 'ability' | 'result' | 'turn'
export type AnimStep = { key: string; kind: AnimKind; mine: boolean; text: string; cards: (string | null)[]; ids: string[]; duration: number }
export type LogEntry = { sequence: number; mine: boolean; text: string }
const DURATION: Record<AnimKind, number> = { draw: 420, play: 520, 'don-attach': 420, 'don-rest': 300, attack: 640, block: 560, counter: 560, power: 480, life: 620, trigger: 760, ko: 640, trash: 420, ability: 520, result: 900, turn: 520 }
type Event = View['projection']['events'][number] & { revealedCard?: { printingKey: string } }

function printingOf(view: View, id: string | undefined): string | null {
  if (!id) return null
  return findVisible(view, id)?.printingKey ?? null
}
function nameOf(view: View, id: string | undefined) { return id ? cardName(view, id) : '' }

/** Readable French journal line for one confirmed event (cards named only when public). */
export function logText(view: View, e: Event): string | null {
  const mine = e.actorId === view.seat, who = mine ? 'Vous' : 'Le bot', card = e.publicInstanceId ? nameOf(view, e.publicInstanceId) : ''
  switch (e.type) {
    case 'DRAWN': return mine ? 'Vous piochez une carte' : 'Le bot pioche une carte'
    case 'ORDER_CHOSEN': return mine ? 'Vous choisissez l’ordre de jeu' : 'Le bot choisit l’ordre de jeu'
    case 'HAND_KEPT': return mine ? 'Vous gardez votre main' : 'Le bot garde sa main'
    case 'DRAW_SKIPPED': return mine ? 'Premier tour : vous ne piochez pas' : 'Premier tour : le bot ne pioche pas'
    case 'DON_ADDED': return mine ? 'Vous recevez des DON!!' : 'Le bot reçoit des DON!!'
    case 'CARD_PLAYED': return `${who} ${mine ? 'jouez' : 'joue'} ${card || 'une carte'}`
    case 'CARD_REVEALED': return e.revealedCard ? `Carte révélée : ${display(view, e.revealedCard.printingKey)?.name ?? 'carte'}` : null
    case 'DON_ATTACHED': return mine ? 'Vous donnez un DON!!' : 'Le bot donne un DON!!'
    case 'ATTACK_DECLARED': return `${who} ${mine ? 'attaquez' : 'attaque'} avec ${card || 'une carte'}`
    case 'BLOCKER_ACTIVATED': return `${card || 'Un Personnage'} bloque l’attaque`
    case 'COUNTER_PLAYED': return `${who} ${mine ? 'jouez' : 'joue'} un Counter${card ? ` : ${card}` : ''}`
    case 'LIFE_DAMAGED': return mine ? 'Vous perdez une carte de Vie' : 'Le bot perd une carte de Vie'
    case 'LIFE_PAID': return mine ? 'Vous ajoutez une Vie à votre main' : 'Le bot ajoute une Vie à sa main'
    case 'LIFE_TRASHED': return mine ? 'Une de vos Vies est défaussée' : 'Une Vie du bot est défaussée'
    case 'LIFE_TURNED_FACE_UP': return mine ? 'Une de vos Vies est retournée face visible' : 'Une Vie du bot est retournée face visible'
    case 'LIFE_TO_DECK': return mine ? 'Une de vos Vies est placée sur votre deck' : 'Une Vie du bot est placée sur son deck'
    case 'LIFE_TO_HAND': return mine ? 'Vous ajoutez une Vie à votre main' : 'Le bot ajoute une Vie à sa main'
    case 'LIFE_ADDED': return mine ? 'Une carte rejoint vos Vies' : 'Une carte rejoint les Vies du bot'
    case 'TRIGGER_ACTIVATED': return `[Trigger] ${card || ''}`.trim()
    case 'CHARACTER_KO': return `${card || 'Un Personnage'} est mis K.O.`
    case 'CARD_TRASHED': return `${card || 'Une carte'} va à la défausse`
    case 'BATTLE_RESOLVED': return 'Fin du combat'
    case 'TURN_ENDED': return mine ? 'Fin de votre tour' : 'Fin du tour du bot'
    case 'HAND_REDRAWN': return mine ? 'Vous repiochez votre main' : 'Le bot repioche sa main'
    case 'GAME_ENDED': return 'Fin de la partie'
    default: return null
  }
}
export function journal(view: View, after = -1): LogEntry[] {
  return (view.projection.events as Event[]).filter(e => e.sequence > after).flatMap(e => { const text = logText(view, e); return text ? [{ sequence: e.sequence, mine: e.actorId === view.seat, text }] : [] })
}

function step(kind: AnimKind, key: string, mine: boolean, text: string, cards: (string | null)[], ids: string[]): AnimStep { return { key, kind, mine, text, cards, ids, duration: DURATION[kind] } }

/** Animation steps for what changed between `prev` (already shown) and `next`. Bot steps keep their order. */
export function animationSteps(prev: View | null, next: View, after: number): AnimStep[] {
  const steps: AnimStep[] = []
  const events = (next.projection.events as Event[]).filter(e => e.sequence > after)
  for (const e of events) {
    const mine = e.actorId === next.seat, id = e.publicInstanceId, key = `e${e.sequence}`, face = printingOf(next, id), name = nameOf(next, id)
    switch (e.type) {
      case 'DRAWN': steps.push(step('draw', key, mine, mine ? 'Pioche' : 'Le bot pioche', [null], [])); break
      case 'CARD_PLAYED': steps.push(step('play', key, mine, `${mine ? 'Vous jouez' : 'Le bot joue'} ${name}`, [face], id ? [id] : [])); break
      case 'DON_ATTACHED': steps.push(step('don-attach', key, mine, 'DON!! donné', [], id ? [id] : [])); break
      case 'ATTACK_DECLARED': {
        const battle = next.projection.battle, target = battle && battle.attacker === id ? battle.target : undefined
        steps.push(step('attack', key, mine, `${name} attaque${target ? ` ${nameOf(next, target)}` : ''}`, [face, target ? printingOf(next, target) : null], [id, target].filter((x): x is string => !!x))); break
      }
      case 'BLOCKER_ACTIVATED': steps.push(step('block', key, mine, `${name} bloque !`, [face], id ? [id] : [])); break
      case 'COUNTER_PLAYED': steps.push(step('counter', key, mine, `Counter${name ? ` : ${name}` : ''}`, [face], id ? [id] : [])); break
      case 'LIFE_DAMAGED': steps.push(step('life', key, mine, mine ? '−1 Vie' : 'Le bot perd une Vie', [null], [])); break
      case 'LIFE_TRASHED': steps.push(step('life', key, mine, mine ? 'Vie défaussée' : 'Vie du bot défaussée', [null], [])); break
      case 'TRIGGER_ACTIVATED': steps.push(step('trigger', key, mine, `[Trigger] ${name}`, [face], id ? [id] : [])); break
      case 'CHARACTER_KO': steps.push(step('ko', key, mine, `${name} K.O.`, [face], id ? [id] : [])); break
      case 'CARD_TRASHED': if (face) steps.push(step('trash', key, mine, `${name} → défausse`, [face], id ? [id] : [])); break
      case 'TURN_ENDED': steps.push(step('turn', key, mine, mine ? 'Tour du bot' : 'À vous de jouer', [], [])); break
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
    if (face) steps.push(step('ability', `a${c.sequence}`, c.controllerId === next.seat, `Capacité : ${nameOf(next, c.subjectId)}`, [face], [c.subjectId]))
  }
  if (prev) {
    // Visible power changes (Counters, effects) and DON!! that became rested (payments).
    for (const p of next.projection.players) for (const v of [...p.leader, ...p.characters] as Visible[]) {
      const before = findVisible(prev, v.id)
      if (before && before.power !== null && v.power !== null && v.power > before.power) steps.push(step('power', `p${v.id}${v.power}`, p.id === next.seat, `${nameOf(next, v.id)} +${v.power - before.power}`, [], [v.id]))
    }
    const battle = next.projection.battle, prevBattle = prev.projection.battle
    if (battle && prevBattle && battle.id === prevBattle.id && (battle.counterBonus ?? 0) > (prevBattle.counterBonus ?? 0)) steps.push(step('power', `cb${battle.id}${battle.counterBonus}`, battle.defenderId === next.seat, `${nameOf(next, battle.target)} +${(battle.counterBonus ?? 0) - (prevBattle.counterBonus ?? 0)}`, [], [battle.target]))
    const rested = (v: View) => seats(v).me.cost.filter(d => (d as Visible).rested).length
    if (rested(next) > rested(prev) && !steps.some(s => s.mine && s.kind === 'play')) steps.push(step('don-rest', `r${next.version}`, true, 'DON!! reposés', [], []))
  }
  return steps
}
export const lastSequence = (view: View) => view.projection.events.at(-1)?.sequence ?? -1
