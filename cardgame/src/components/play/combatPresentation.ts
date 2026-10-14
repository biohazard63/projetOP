import type { View } from './api'
import { findVisible, seats } from './model'

export type CombatPresentation = { outcome: 'ATTACK' | 'DEFENCE' | 'INTERRUPTED' | 'PRESERVED' | 'UNKNOWN'; winner: string | null; detail: string }
/** Describe confirmed consequences, never compare power or predict a regulatory result. */
export function combatPresentation(previous: View | null, next: View, sequence: number): CombatPresentation {
  const events = next.projection.events.filter(e => e.sequence <= sequence)
  const declaration = events.findLast(e => e.type === 'ATTACK_DECLARED')
  const battle = previous?.gameId === next.gameId ? previous.projection.battle : null
  if (!battle || declaration?.publicInstanceId !== battle.attacker || declaration.sequence > (previous?.projection.events.at(-1)?.sequence ?? -1)) return { outcome: 'UNKNOWN', winner: null, detail: 'Combat terminé' }
  const consequences = events.filter(e => e.sequence > declaration.sequence)
  const attackSucceeded = consequences.some(e => (e.type === 'CHARACTER_KO' && e.publicInstanceId === battle.target && e.actorId === battle.attackerControllerId) || (e.type === 'LIFE_DAMAGED' && e.actorId === battle.defenderId))
  const who = (id: string) => id === next.seat ? 'Vous' : 'L’adversaire'
  if (attackSucceeded) return { outcome: 'ATTACK', winner: who(battle.attackerControllerId), detail: consequences.some(e => e.type === 'LIFE_DAMAGED' && e.actorId === battle.defenderId) ? 'Dégât de Vie confirmé' : 'Cible mise K.O.' }
  const { me, foe } = seats(next)
  const fieldIds = [...me.leader, ...me.characters, ...foe.leader, ...foe.characters].map(c => c.id)
  if (!fieldIds.includes(battle.attacker) || !fieldIds.includes(battle.target)) return { outcome: 'INTERRUPTED', winner: null, detail: 'Un participant a quitté le terrain' }
  const attack = findVisible(previous!, battle.attacker)?.power, defence = findVisible(previous!, battle.target)?.power
  // Only the last explicit Damage window has server-calculated participant powers. A protected K.O. must not be called a defence won on power.
  if (['COUNTER', 'DAMAGE'].includes(battle.step) && attack != null && defence != null && attack < defence + (battle.counterBonus ?? 0)) return { outcome: 'DEFENCE', winner: who(battle.defenderId), detail: 'Défense supérieure à l’attaque' }
  return { outcome: 'PRESERVED', winner: null, detail: 'La cible est préservée ; aucun K.O. ni dégât de Vie confirmé' }
}
