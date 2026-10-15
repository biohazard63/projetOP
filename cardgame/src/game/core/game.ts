import { createEffectRuntime, effectActions, applyEffectCommand, projectEffects, capturePlayedEffects } from '../effects/runtime'
import { adaptCard } from '../cards/adapter'
import { keywordOnlyText } from '../cards/keywordText'
import { validateEngineDeck } from '../rulesets/decks'
import { assertGameInvariants } from './invariants'
import { sample, seededRandom, shuffle, type RandomGenerator } from './random'
import { applyBasicTurn, basicActions, effectivePower, processDefeat } from './turns'
import { applyCombatCommand, combatActions } from './combat'
import { ZONES, type Command, type GameInput, type GameState, type LegalAction, type PublicEvent, type Transition, type Zone } from './types'

const validId = (s: unknown): s is string => typeof s === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(s)
function event(state: GameState, type: PublicEvent['type'], actorId?: string) {
  state.events.push({ sequence: state.events.length, type, ...(actorId ? { actorId } : {}) })
}
function moveTop(state: GameState, playerId: string, from: Zone, to: Zone, count: number): string[] {
  const player = state.players.find(p => p.id === playerId)!
  const moved = player.zones[from].splice(0, count)
  if (moved.length !== count) throw new Error('INSUFFICIENT_CARDS')
  for (const id of moved) { state.instances[id].zone = to; state.instances[id].zoneGeneration++ }
  player.zones[to].push(...moved)
  return moved
}

// Bandai comprehensive v1.2.1 §§5-1, 5-2. BASIC_TURNS enables only base actions; no combat or ability commands.
export function createGame(input: GameInput, generator: RandomGenerator = seededRandom): GameState {
  if (!validId(input.gameId) || input.players.length !== 2 || !input.players.every(p => validId(p.id)) || input.players[0].id === input.players[1].id) throw new Error('INVALID_GAME_OR_PLAYERS')
  if (!Number.isSafeInteger(input.seed) || input.seed < 1 || input.seed > 0xffffffff || !validId(generator.id)) throw new Error('INVALID_SEED_OR_GENERATOR')
  if (input.ruleset.rulesVersion !== '1.2.1') throw new Error('UNSUPPORTED_RULES_VERSION')
  if (input.scope !== undefined && !['SETUP_ONLY', 'BASIC_TURNS'].includes(input.scope)) throw new Error('INVALID_SCOPE')
  if (new Set(input.definitions.map(d => d.definitionId)).size !== input.definitions.length || new Set(input.printings.map(p => p.printingKey)).size !== input.printings.length) throw new Error('DUPLICATE_CATALOG_ID')
  for (const d of input.definitions) {
    const checked = adaptCard({ ...d, number: d.number, printingKey: `${d.number}::standard`, databaseIds: [], extensions: [] })
    if (!checked.ok || checked.card.definition.definitionId !== d.definitionId || d.number !== checked.card.definition.number) throw new Error('INVALID_CATALOG_DEFINITION')
  }
  for (const p of input.players) {
    if (p.donCount !== 10) throw new Error('EXACTLY_TEN_DON')
    const errors = validateEngineDeck(p.cards, input.definitions, input.printings, input.ruleset, 'composition')
    if (errors.length) throw new Error(`INVALID_DECK:${errors.join(',')}`)
    for (const entry of p.cards) {
      const printing = input.printings.find(v => v.printingKey === entry.printingKey)!
      const d = input.definitions.find(d => d.definitionId === printing.definitionId)!
      const triggerProgram = input.effectRegistry?.definitions.some(effect => effect.timing === 'TRIGGER' && effect.source.kind === 'CARD_DEFINITION' && effect.source.definitionId === d.definitionId)
      if ((!d.review.effects.length && (d.review.effectOriginal.trim() || d.review.effectFr.trim()) && !d.review.counterEvent && !keywordOnlyText(d.review.effectOriginal, d.review.combatKeywords ?? [])) || ((d.review.triggerOriginal.trim() || d.review.triggerFr.trim()) && !triggerProgram)) throw new Error('INCOMPLETE_EFFECT_PROGRAM')
      // Explicit allowlist: unknown/start-game/construction/continuous effects cannot be skipped.
      if (d.review.effects.some(e => {
        // With the 1.3.0 runtime the reviewed spec must be backed by an executable [Activate: Main] program, otherwise
        // the ability would be offered nowhere. Older laboratory scopes keep their documented behaviour.
        if (e.kind === 'giveRestedDon') return e.timing !== 'ACTIVATE_MAIN' || e.oncePerTurn !== true || e.amount.min !== 0 || e.amount.max !== 1 || e.from !== 'OWN_COST_RESTED' || e.target !== 'OWN_LEADER_OR_CHARACTER'
          || (input.effectRegistry?.version === '1.3.0' && !input.effectRegistry.definitions.some(a => a.timing === 'ACTIVATE_MAIN' && a.usage.kind === 'ONCE_PER_TURN' && a.source.kind === 'CARD_DEFINITION' && a.source.definitionId === d.definitionId && a.program.some(step => step.kind === 'OPERATION' && step.operation.primitive === 'attachRestedDon')))
        if (e.kind === 'blocker') return e.timing !== 'BLOCK' || e.cost !== 'REST_SELF' || e.target !== 'SELF'
        if (e.kind === 'declarative') return !['1.1.0','1.2.0','1.3.0'].includes(input.effectRegistry?.version ?? '') || (!e.abilityIds.length || e.abilityIds.some(id => !input.effectRegistry?.definitions.some(a => a.id === id && a.source.kind === 'CARD_DEFINITION' && a.source.definitionId === d.definitionId) && !input.effectRegistry?.continuous?.some(a => a.id === id && a.definitionId === d.definitionId) && !input.effectRegistry?.conditionalKeywords?.some(a => a.id === id && a.definitionId === d.definitionId) && !input.effectRegistry?.cardReplacements?.some(a => a.id === id && a.definitionId === d.definitionId) && !input.effectRegistry?.leaderReplacements?.some(a => a.id === id && a.definitionId === d.definitionId) && !input.effectRegistry?.koProtections?.some(a => a.id === id && a.definitionId === d.definitionId) && !input.effectRegistry?.attackProhibitions?.some(a => a.id === id && a.definitionId === d.definitionId) && !input.effectRegistry?.lifeRules?.some(a => a.id === id && a.definitionId === d.definitionId)))
        return true
      }) || d.review.requiredCapabilities.some(e => !['giveRestedDon', 'blocker', ...(d.review.counterEvent ? ['counterEvent'] : []), ...(triggerProgram ? ['trigger'] : []), ...(['1.1.0','1.2.0','1.3.0'].includes(input.effectRegistry?.version ?? '') ? ['declarative'] : [])].includes(e))) throw new Error('UNSUPPORTED_SETUP_EFFECT')
      if (d.category === 'LEADER' && (d.life === null || d.life > 45)) throw new Error('INVALID_LEADER_LIFE')
    }
  }
  const newPlayer = (id: string): GameState['players'][number] => ({ id, zones: { leader: [], deck: [], hand: [], life: [], characters: [], stage: [], trash: [], donDeck: [], cost: [], attached: [], temporary: [] }, mulligan: 'PENDING', turns: 0 })
  const players: GameState['players'] = [newPlayer(input.players[0].id), newPlayer(input.players[1].id)]
  if (input.effectRegistry !== undefined && input.scope !== 'BASIC_TURNS') throw new Error('EFFECT_SCOPE_NOT_SUPPORTED')
  const effectRuntime = input.effectRegistry === undefined ? undefined : createEffectRuntime(input.effectRegistry)
  if (effectRuntime?.registry.version === '1.1.0' || effectRuntime?.registry.version === '1.2.0' || effectRuntime?.registry.version === '1.3.0') {
    for (const ability of effectRuntime.registry.definitions) {
      const source = ability.source
      if (source.kind !== 'CARD_DEFINITION') throw new Error('INVALID_CARD_PROGRAM_SOURCE')
      const d = input.definitions.find(d => d.definitionId === source.definitionId)
      if (!d || (source.zone === 'temporary' ? d.category === 'DON' : (source.zone === 'trash' || source.zone === 'delayed') ? ['DON', 'LEADER'].includes(d.category) : source.zone === 'hand' ? d.category !== 'EVENT' : ({ leader: 'LEADER', characters: 'CHARACTER', stage: 'STAGE' }[source.zone] !== d.category))) throw new Error('INVALID_CARD_PROGRAM_SOURCE')
    }
    for (const ability of [...effectRuntime.registry.continuous ?? [], ...effectRuntime.registry.cardReplacements ?? []]) if (input.definitions.find(d => d.definitionId === ability.definitionId)?.category !== ({ leader: 'LEADER', stage: 'STAGE', characters: 'CHARACTER', hand: 'CHARACTER' } as Record<string, string>)[ability.zone]) throw new Error('INVALID_CONTINUOUS_SOURCE')
  }
  const state: GameState = {
    schemaVersion: effectRuntime ? 2 : 1, ...(effectRuntime ? { effects: effectRuntime } : {}), battle: null, gameId: input.gameId, version: 0, scope: input.scope ?? 'SETUP_ONLY', phase: 'CHOOSE_FIRST', players, instances: {},
    catalog: structuredClone({ definitions: input.definitions, printings: input.printings }), ruleset: structuredClone(input.ruleset),
    random: { algorithm: generator.id, value: input.seed, draws: 0 }, chooserId: '', firstPlayerId: null, activePlayerId: null, decisionPlayerId: null,
    turn: 0, automaticPlayReady: false, unsupportedEffects: [], events: [], commands: [],
    ...(input.scope === 'BASIC_TURNS' ? { result: null } : {}),
  }
  for (let index = 0; index < players.length; index++) {
    const p = players[index]
    let serial = 0
    function add(zone: Zone, printingKey: string | null, definitionId: string | null) {
      const id = `${state.gameId}:p${index}:c${serial++}`
      state.instances[id] = { id, owner: p.id, controller: p.id, zone, printingKey, definitionId, kind: zone === 'donDeck' ? 'DON' : 'CARD', rested: false, faceUp: zone === 'leader', attachedTo: null, zoneGeneration: 0 }
      p.zones[zone].push(id)
    }
    for (const entry of input.players[index].cards) {
      const printing = state.catalog.printings.find(p => p.printingKey === entry.printingKey)!
      const d = state.catalog.definitions.find(d => d.definitionId === printing.definitionId)!
      for (let n = 0; n < entry.quantity; n++) add(d.category === 'LEADER' ? 'leader' : 'deck', printing.printingKey, d.definitionId)
      state.unsupportedEffects.push(...d.review.requiredCapabilities)
    }
    for (let n = 0; n < 10; n++) add('donDeck', null, null)
    p.zones.deck = shuffle(p.zones.deck, state.random, generator)
  }
  state.unsupportedEffects = [...new Set(state.unsupportedEffects)].sort()
  // RPS outcome may be provided by a trusted caller; otherwise a seeded coin chooses the decision-maker.
  state.chooserId = input.chooserId ?? players[Math.floor(sample(state.random, generator) * 2)].id
  if (!players.some(p => p.id === state.chooserId)) throw new Error('INVALID_CHOOSER')
  state.decisionPlayerId = state.chooserId
  event(state, 'CREATED')
  assertGameInvariants(state)
  return state
}

export function getLegalActions(state: GameState, actorId: string): LegalAction[] {
  assertGameInvariants(state)
  if (state.result) return []
  if (state.phase === 'CHOOSE_FIRST') return actorId === state.decisionPlayerId ? [{ type: 'CHOOSE_FIRST', choices: ['FIRST', 'SECOND'] }] : []
  if (state.phase === 'MULLIGAN') return actorId === state.decisionPlayerId ? [{ type: 'MULLIGAN', choices: [false, true] }] : []
  if (state.battle && (state.effects?.choice || state.effects?.scheduler?.orderChoice)) return effectActions(state, actorId)
  if (state.battle) return combatActions(state, actorId)
  const effects = effectActions(state, actorId)
  return (state.effects?.choice || state.effects?.scheduler?.orderChoice) ? effects : [...basicActions(state, actorId), ...combatActions(state, actorId), ...effects]
}

function commandIsValid(raw: unknown): raw is Command {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  const c = raw as Record<string, unknown>
  const fields: Record<string, string[]> = { CHOOSE_FIRST: ['choice'], MULLIGAN: ['redraw'], ADVANCE_PHASE: [], END_MAIN: [], PLAY_CARD: ['instanceId', 'donIds', 'replaceId'], ATTACH_DON: ['donIds', 'targetId'], START_EFFECT: ['effectId'], CONCEDE: [], ANSWER_CHOICE: ['choiceId', 'tokens'], ANSWER_TRIGGER: ['choiceId', 'activate'], DECLARE_ATTACK: ['attackerId', 'targetId'], ACTIVATE_BLOCKER: ['blockerId', 'battleId'], PASS_BLOCKER: ['battleId'], PLAY_COUNTER_CHARACTER: ['cardId', 'targetId', 'battleId'], PLAY_COUNTER_EVENT: ['cardId', 'targetId', 'paymentDonIds', 'donMinusIds', 'battleId'], PASS_COUNTER: ['battleId'], RESOLVE_BATTLE: ['battleId'], CONTINUE_LIFE_DAMAGE: ['battleId'] }
  const extra = typeof c.type === 'string' && Object.hasOwn(fields, c.type) ? fields[c.type] : undefined
  if (!extra || !validId(c.id) || !validId(c.actorId) || !Number.isSafeInteger(c.expectedVersion) || Number(c.expectedVersion) < 0) return false
  const required = ['id', 'actorId', 'expectedVersion', 'type', ...extra]
  const optional = c.type === 'PLAY_COUNTER_EVENT' ? ['lifePayment'] : c.type === 'START_EFFECT' ? ['payOptionalCost', 'donMinusIds'] : []
  const keys = [...required, ...optional]
  if (!required.every(k => Object.hasOwn(c, k)) || !Object.keys(c).every(k => keys.includes(k)) || (Object.hasOwn(c, 'lifePayment') && typeof c.lifePayment !== 'boolean') || (Object.hasOwn(c, 'payOptionalCost') && typeof c.payOptionalCost !== 'boolean')) return false
  const instanceId = (v: unknown) => typeof v === 'string' && /^[A-Za-z0-9_:-]{1,256}$/.test(v)
  if (extra.includes('donIds') && (!Array.isArray(c.donIds) || c.donIds.length > 10 || !c.donIds.every(instanceId))) return false
  if (c.type === 'PLAY_COUNTER_EVENT' && (!instanceId(c.cardId) || !instanceId(c.battleId) || !Array.isArray(c.paymentDonIds) || c.paymentDonIds.length > 10 || !c.paymentDonIds.every(instanceId) || !(c.targetId === null || instanceId(c.targetId)) || !Array.isArray(c.donMinusIds) || c.donMinusIds.length > 10 || !c.donMinusIds.every(instanceId))) return false
  if (c.type === 'START_EFFECT') return typeof c.effectId === 'string' && /^[A-Za-z0-9_:@.-]{1,256}$/.test(c.effectId) && (!Object.hasOwn(c, 'donMinusIds') || (Array.isArray(c.donMinusIds) && c.donMinusIds.length <= 10 && c.donMinusIds.every(instanceId)))
  if (c.type === 'ANSWER_CHOICE') return instanceId(c.choiceId) && Array.isArray(c.tokens) && c.tokens.length <= 10 && c.tokens.every(instanceId)
  if (c.type === 'ANSWER_TRIGGER') return instanceId(c.choiceId) && typeof c.activate === 'boolean'
  if (c.type === 'CHOOSE_FIRST') return c.choice === 'FIRST' || c.choice === 'SECOND'
  if (c.type === 'MULLIGAN') return typeof c.redraw === 'boolean'
  if (c.type === 'PLAY_CARD') return instanceId(c.instanceId) && (c.replaceId === null || instanceId(c.replaceId))
  if (c.type === 'ATTACH_DON') return instanceId(c.targetId)
  if (c.type === 'DECLARE_ATTACK') return instanceId(c.attackerId) && instanceId(c.targetId)
  if (c.type === 'ACTIVATE_BLOCKER') return instanceId(c.blockerId) && instanceId(c.battleId)
  if (c.type === 'PASS_BLOCKER' || c.type === 'PASS_COUNTER' || c.type === 'RESOLVE_BATTLE' || c.type === 'CONTINUE_LIFE_DAMAGE') return instanceId(c.battleId)
  if (c.type === 'PLAY_COUNTER_CHARACTER') return instanceId(c.cardId) && instanceId(c.targetId) && instanceId(c.battleId)
  return true
}
function sameCommand(a: Command, b: Command): boolean {
  const left = a as unknown as Record<string, unknown>, right = b as unknown as Record<string, unknown>
  return Object.keys(left).length === Object.keys(right).length && Object.keys(left).every(k => JSON.stringify(left[k]) === JSON.stringify(right[k]))
}
export function applyCommand(previous: GameState, raw: unknown, generator: RandomGenerator = seededRandom): Transition {
  try { assertGameInvariants(previous) } catch { return { ok: false, error: 'INVALID_STATE' } }
  if (!commandIsValid(raw)) return { ok: false, error: 'INVALID_COMMAND' }
  const command = raw
  const prior = previous.commands.find(c => c.id === command.id && c.actorId === command.actorId)
  if (prior) return sameCommand(prior, command) ? { ok: true, state: structuredClone(previous), events: [], replayed: true } : { ok: false, error: 'COMMAND_ID_CONFLICT' }
  if (!previous.players.some(p => p.id === command.actorId)) return { ok: false, error: 'UNKNOWN_ACTOR' }
  if (command.expectedVersion !== previous.version) return { ok: false, error: 'STALE_VERSION' }
  // CR 1.2.1 §1-2-3/§1-2-4: a player may concede at any point of a started game; it is never a listed action
  // (it is always available) and no card can prevent or replace it.
  if (command.type === 'CONCEDE' ? previous.scope !== 'BASIC_TURNS' || !!previous.result : !getLegalActions(previous, command.actorId).some(a => a.type === command.type)) return { ok: false, error: 'ILLEGAL_ACTION' }
  const state = structuredClone(previous)
  const fromEvent = state.events.length
  try {
    if (command.type === 'CONCEDE') {
      state.result = { reason: 'CONCESSION', loserIds: [command.actorId], winnerId: state.players.find(p => p.id !== command.actorId)!.id }
      state.decisionPlayerId = null
      event(state, 'GAME_ENDED', command.actorId)
    } else if (command.type === 'CHOOSE_FIRST') {
      state.firstPlayerId = command.choice === 'FIRST' ? command.actorId : state.players.find(p => p.id !== command.actorId)!.id
      state.activePlayerId = state.firstPlayerId; state.decisionPlayerId = state.firstPlayerId; state.phase = 'MULLIGAN'
      event(state, 'ORDER_CHOSEN', command.actorId)
      for (const p of state.players) moveTop(state, p.id, 'deck', 'hand', 5)
      event(state, 'HANDS_DEALT')
    } else if (command.type === 'MULLIGAN') {
      const player = state.players.find(p => p.id === command.actorId)!
      if (command.redraw) {
        moveTop(state, player.id, 'hand', 'deck', 5)
        player.zones.deck = shuffle(player.zones.deck, state.random, generator)
        moveTop(state, player.id, 'deck', 'hand', 5)
      }
      player.mulligan = command.redraw ? 'REDRAWN' : 'KEPT'
      event(state, command.redraw ? 'HAND_REDRAWN' : 'HAND_KEPT', player.id)
      state.decisionPlayerId = state.players.find(p => p.mulligan === 'PENDING')?.id ?? null
      if (state.decisionPlayerId === null) {
        for (const p of state.players) {
          const leader = state.catalog.definitions.find(d => d.definitionId === state.instances[p.zones.leader[0]].definitionId)!
          // Index 0 is the top in both arrays. First deck card becomes bottom Life.
          moveTop(state, p.id, 'deck', 'life', leader.life!)
          p.zones.life.reverse()
        }
        state.phase = 'REFRESH'; state.turn = 1
        state.players.find(p => p.id === state.firstPlayerId)!.turns = 1
        event(state, 'PREPARED')
      }
    } else if (command.type === 'ANSWER_CHOICE' && state.battle?.step === 'KO_REPLACEMENT') applyCombatCommand(state, command)
    else if (command.type === 'START_EFFECT' || command.type === 'ANSWER_CHOICE') applyEffectCommand(state, command)
    else if (command.type === 'DECLARE_ATTACK' || command.type === 'ACTIVATE_BLOCKER' || command.type === 'PASS_BLOCKER' || command.type === 'PLAY_COUNTER_CHARACTER' || command.type === 'PLAY_COUNTER_EVENT' || command.type === 'PASS_COUNTER' || command.type === 'RESOLVE_BATTLE' || command.type === 'CONTINUE_LIFE_DAMAGE' || command.type === 'ANSWER_TRIGGER') applyCombatCommand(state, command)
    else applyBasicTurn(state, command)
    capturePlayedEffects(state, state.events.slice(fromEvent))
    endInterruptedBattle(state)
    state.commands.push(structuredClone(command)); state.version++
    processDefeat(state)
    assertGameInvariants(state)
    return { ok: true, state, events: state.events.slice(fromEvent), replayed: false }
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'TRANSITION_FAILED' } }
}

// Server snapshots are private. Rehydration never accepts a player projection as state.
export function restoreGame(json: string): GameState {
  const state = JSON.parse(json) as GameState & { battle?: GameState['battle'] }
  if (state.battle === undefined && [1, 2].includes(state.schemaVersion)) state.battle = null
  assertGameInvariants(state)
  return state
}

// Explicit allowlist: do not spread the authoritative state, instance registry or logs.
export function projectState(state: GameState, viewerId: string | null) {
  assertGameInvariants(state)
  if (viewerId !== null && !state.players.some(p => p.id === viewerId)) throw new Error('UNKNOWN_VIEWER')
  const visible = (id: string) => {
    const i = state.instances[id]
    return { id: i.id, kind: i.kind, printingKey: i.printingKey, definitionId: i.definitionId, rested: i.rested, attachedTo: i.attachedTo, power: effectivePower(state, id) }
  }
  return {
    gameId: state.gameId, version: state.version, scope: state.scope, phase: state.phase, firstPlayerId: state.firstPlayerId,
    activePlayerId: state.activePlayerId, decisionPlayerId: state.decisionPlayerId, turn: state.turn, automaticPlayReady: false, result: structuredClone(state.result ?? null),
    battle: state.battle ? { id: state.battle.id, step: state.battle.step, attacker: state.battle.attacker.instanceId, target: state.battle.target.instanceId, attackerControllerId: state.battle.attackerControllerId, defenderId: state.battle.defenderId,
      // Public: Counters already played on the battle target (each COUNTER_PLAYED is a public event).
      counterBonus: state.battle.counterModifiers.filter(m => m.target.instanceId === state.battle!.target.instanceId && m.target.generation === state.battle!.target.generation).reduce((n, m) => n + m.amount, 0),
      lifeTrigger: state.battle.pendingLifeTrigger ? state.battle.pendingLifeTrigger.actorId === viewerId ? { choiceId: state.battle.pendingLifeTrigger.id, choices: [false, true] } : { waiting: true } : null } : null,
    players: state.players.map(p => ({
      id: p.id, turns: p.turns, mulligan: p.mulligan,
      counts: Object.fromEntries(ZONES.map(z => [z, p.zones[z].length])),
      leader: p.zones.leader.map(visible), characters: p.zones.characters.map(visible), stage: p.zones.stage.map(visible), trash: p.zones.trash.map(visible),
      donDeck: p.zones.donDeck.map(visible), cost: p.zones.cost.map(visible), attached: p.zones.attached.map(visible),
      hand: p.id === viewerId ? p.zones.hand.map(visible) : null,
      // Face-up Life cards (placed face-up by an effect) are public; listed only when there are any.
      ...(p.zones.life.some(id => state.instances[id].faceUp) ? { lifeFaceUp: p.zones.life.flatMap((id, index) => state.instances[id].faceUp ? [{ index, card: visible(id) }] : []) } : {}),
    })),
    ...(state.effects ? { effects: projectEffects(state, viewerId) } : {}),
    events: state.events.map(e => ({ sequence: e.sequence, type: e.type, ...(e.actorId ? { actorId: e.actorId } : {}), ...(e.publicInstanceId ? { publicInstanceId: e.publicInstanceId } : {}), ...(e.revealedCard ? { revealedCard: structuredClone(e.revealedCard) } : {}) })),
  }
}

// Rules FAQ ("Basic Rules"), FAQ ST03-003/ST03-016: if the attacking Character or the attack target left its area
// during the Attack, Block or Counter Step, the battle ends without proceeding (no damage, no K.O.). Applied once the
// effect that moved it has fully resolved.
function endInterruptedBattle(state: GameState): void {
  const battle = state.battle
  if (!battle || ['LIFE_TRIGGER', 'LIFE_CONTINUE', 'KO_REPLACEMENT'].includes(battle.step) || state.effects?.continuation || state.effects?.scheduler?.resolvingId || state.effects?.scheduler?.orderChoice) return
  const present = (ref: { instanceId: string; generation: number }) => { const i = state.instances[ref.instanceId]; return !!i && ['leader', 'characters'].includes(i.zone) && i.zoneGeneration === ref.generation }
  if (present(battle.attacker) && present(battle.target)) return
  state.events.push({ sequence: state.events.length, type: 'BATTLE_RESOLVED', actorId: battle.attackerControllerId })
  state.battle = null
}
