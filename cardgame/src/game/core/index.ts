export { createGame, applyCommand, getLegalActions, projectState, restoreGame } from './game'
export { assertGameInvariants } from './invariants'
export { seededRandom } from './random'
export type { RandomGenerator, RandomState } from './random'
export type { GameInput, GameState, Command, CombatCommand, BattleState, BattlePresence, Transition, LegalAction, PlayerDeck, Instance, Phase, Zone } from './types'

export type { EffectDefinition, EffectInstance, EffectSource, EffectContext, Condition, Selector, Cost, ProposedOperation, CommittedEvent, PendingChoice, SerializableContinuation, ResolutionContext, ResolutionStatus, EffectDuration, EffectUsageLimit, EffectRegistry, PrimitiveRegistry, CharacteristicModifier } from '../effects/contracts'

export { evaluateCharacteristics } from '../effects/characteristics'
