import { z } from 'zod'
import { applyCommand, createGame, getLegalActions } from '../../game/core/game'
import type { Command, GameState } from '../../game/core/types'
import type { DeckEntry } from '../../game/rulesets/decks'
import type { CardPrinting } from '../../game/cards/types'
import { botDecision, BOT_LEVELS, type BotLevel } from './strategy'
import { engineCatalog, currentEngineRegistry, engineRuleset, scopedToDecks } from './catalog'
import { REFERENCE_DECKS, deckEligibility } from './decks'
import { createSecureSeed } from './seed'
import { playerView, type PlayerView } from './view'
import type { GameRepository, StoredCommand, StoredGame } from './repository'

export const HUMAN_SEAT = 'player'
export const BOT_SEAT = 'bot'
export const ENGINE_VERSION = 'm4-2026-10-12'
const MAX_BOT_STEPS = 400

export class PlayError extends Error {
  constructor(readonly status: 400 | 404 | 409 | 422, readonly code: string, readonly detail?: Record<string, unknown>) { super(code) }
}
// Client intent: a command without identity fields. actorId and expectedVersion are never taken from it.
const id = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/)
export const commandRequest = z.strictObject({ id, expectedVersion: z.number().int().nonnegative(), intent: z.record(z.string(), z.unknown()).refine(i => typeof i.type === 'string' && !('actorId' in i) && !('id' in i) && !('expectedVersion' in i), 'INVALID_INTENT') })
const referenceDeck = z.strictObject({ kind: z.literal('reference'), id: z.string().min(1).max(64) })
export const startRequest = z.strictObject({ botLevel: z.enum(['easy', 'normal', 'hard']).optional(), opponent: z.union([z.literal('random'), referenceDeck]).optional(), deck: z.discriminatedUnion('kind', [z.strictObject({ kind: z.literal('reference'), id: z.string().min(1).max(64) }), z.strictObject({ kind: z.literal('user'), deckId: id })]) })
export type DeckChoice = { ref: string; entries: DeckEntry[]; printings?: CardPrinting[] }
/** The bot's deck: a reference or Starter deck by id, or one drawn at random among the playable ones. */
export type OpponentChoice = 'random' | { kind: 'reference'; id: string }
export type PlayStats = { played: number; wins: number; losses: number; concessions: number; byDeck: Record<string, { played: number; wins: number }>; byLevel: Record<string, { played: number; wins: number }> }
const levelOf = (value: string): BotLevel => (BOT_LEVELS as string[]).includes(value) ? value as BotLevel : 'normal'

/** Lets the server bot play every decision it owns, until the human must act or the game ends. */
export function advanceBot(state: GameState, botSeat = BOT_SEAT, humanSeat = HUMAN_SEAT, level: BotLevel = 'normal'): { state: GameState; commands: StoredCommand[] } {
  const commands: StoredCommand[] = []
  for (let step = 0; step < MAX_BOT_STEPS && !state.result; step++) {
    const actions = getLegalActions(state, botSeat)
    if (!actions.length || getLegalActions(state, humanSeat).length) break
    // The strategy sees only the bot's projection; botDecision falls back to a safe legal answer if needed.
    const command = { ...botDecision(state, botSeat, level).intent, id: `bot-${state.version}`, actorId: botSeat, expectedVersion: state.version } as Command
    const result = applyCommand(state, command)
    if (!result.ok) throw new Error(`BOT_REFUSED:${result.error}`) // a bot command is built from legal actions: refusal is an engine defect
    state = result.state
    commands.push({ seq: 0, commandId: command.id, actorSeat: botSeat, type: command.type, payload: command, resultVersion: state.version })
  }
  return { state, commands }
}
const numbered = (commands: StoredCommand[], from: number) => commands.map((c, i) => ({ ...c, seq: from + i }))
const statusOf = (state: GameState) => state.result ? 'FINISHED' as const : 'ACTIVE' as const

export class PlayService {
  constructor(private readonly repo: GameRepository, private readonly seed: () => number = createSecureSeed) {}

  async active(userId: string, sinceEvent = 0): Promise<PlayerView | null> {
    const game = await this.repo.findActive(userId)
    return game ? playerView(game, sinceEvent) : null
  }
  async view(userId: string, gameId: string, sinceEvent = 0): Promise<PlayerView> {
    return playerView(await this.owned(userId, gameId), sinceEvent)
  }
  async start(userId: string, deck: DeckChoice, botLevel: BotLevel = 'normal', opponent?: OpponentChoice): Promise<PlayerView> {
    if (await this.repo.findActive(userId)) throw new PlayError(409, 'ACTIVE_GAME_EXISTS')
    const catalog = engineCatalog(), printings = deck.printings ?? catalog.printings
    const eligibility = deckEligibility(deck.entries, printings)
    if (!eligibility.ok) throw new PlayError(422, 'DECK_NOT_PLAYABLE', { errors: eligibility.errors })
    const leader = deck.entries.map(e => printings.find(p => p.printingKey === e.printingKey)).map(p => p && catalog.definitions.find(d => d.definitionId === p.definitionId)).find(d => d?.category === 'LEADER')
    const bot = this.botDeck(opponent, leader?.colors.includes('PURPLE') ? 'reference-red' : 'reference-purple')
    // The player's printings first (a personal deck maps its database cards), then the catalogue's for the bot deck.
    const merged = [...new Map([...catalog.printings, ...printings].map(p => [p.printingKey, p])).values()]
    const scoped = scopedToDecks([deck.entries, bot.entries], merged, catalog.definitions, currentEngineRegistry())
    let state = createGame({ gameId: `play-${Date.now().toString(36)}`, seed: this.seed(), scope: 'BASIC_TURNS', chooserId: HUMAN_SEAT, definitions: scoped.definitions, printings: scoped.printings, ruleset: engineRuleset(), effectRegistry: scoped.registry,
      players: [{ id: HUMAN_SEAT, cards: structuredClone(deck.entries), donCount: 10 }, { id: BOT_SEAT, cards: structuredClone(bot.entries), donCount: 10 }] })
    const advanced = advanceBot(state, BOT_SEAT, HUMAN_SEAT, botLevel); state = advanced.state
    const game = await this.repo.create({ userId, status: statusOf(state), humanSeat: HUMAN_SEAT, botSeat: BOT_SEAT, deckRef: deck.ref, botDeckRef: bot.id, botLevel, rulesetId: state.ruleset.id, engineVersion: ENGINE_VERSION,
      version: state.version, state, result: state.result ?? null }, numbered(advanced.commands, 1))
    if (!game) throw new PlayError(409, 'ACTIVE_GAME_EXISTS')
    return playerView(game)
  }
  private botDeck(opponent: OpponentChoice | undefined, fallback: string) {
    if (!opponent) return REFERENCE_DECKS.find(d => d.id === fallback)!
    if (opponent === 'random') {
      const playable = REFERENCE_DECKS.filter(d => d.id.startsWith('starter-') && deckEligibility(d.entries).ok)
      return playable[this.seed() % playable.length]
    }
    const chosen = REFERENCE_DECKS.find(d => d.id === opponent.id)
    if (!chosen) throw new PlayError(404, 'OPPONENT_NOT_FOUND')
    const eligibility = deckEligibility(chosen.entries)
    if (!eligibility.ok) throw new PlayError(422, 'OPPONENT_NOT_PLAYABLE', { errors: eligibility.errors })
    return chosen
  }
  async command(userId: string, gameId: string, body: unknown): Promise<{ view: PlayerView; replayed: boolean }> {
    const parsed = commandRequest.safeParse(body)
    if (!parsed.success) throw new PlayError(400, 'INVALID_COMMAND')
    const game = await this.owned(userId, gameId)
    const { id: commandId, expectedVersion, intent } = parsed.data
    const prior = await this.repo.findCommand(game.id, commandId)
    if (prior) {
      // Same id retried (lost response, second tab): same intent is a replay, a different one is refused.
      const payload = prior.payload as Record<string, unknown>
      const same = prior.actorSeat === game.humanSeat && Object.entries(intent).every(([k, v]) => JSON.stringify(payload[k]) === JSON.stringify(v)) && Object.keys(payload).filter(k => !['id', 'actorId', 'expectedVersion'].includes(k)).length === Object.keys(intent).length
      if (!same) throw new PlayError(409, 'COMMAND_ID_CONFLICT')
      return { view: playerView(game), replayed: true }
    }
    if (game.status !== 'ACTIVE') throw new PlayError(409, 'GAME_FINISHED')
    if (expectedVersion !== game.version) throw new PlayError(409, 'STALE_VERSION', { version: game.version })
    const command = { ...intent, id: commandId, actorId: game.humanSeat, expectedVersion } as Command
    const result = applyCommand(game.state, command)
    if (!result.ok) throw new PlayError(422, result.error)
    const human: StoredCommand = { seq: 0, commandId, actorSeat: game.humanSeat, type: command.type, payload: command, resultVersion: result.state.version }
    const advanced = advanceBot(result.state, game.botSeat, game.humanSeat, levelOf(game.botLevel))
    const state = advanced.state
    const seq = await this.nextSeq(game)
    const ok = await this.repo.commit(game.id, game.version, { version: state.version, state, status: statusOf(state), result: state.result ?? null }, numbered([human, ...advanced.commands], seq))
    if (!ok) throw new PlayError(409, 'STALE_VERSION')
    return { view: playerView({ ...game, version: state.version, state, status: statusOf(state), result: state.result ?? null }), replayed: false }
  }
  async concede(userId: string, gameId: string, commandId: string): Promise<{ view: PlayerView; replayed: boolean }> {
    const game = await this.owned(userId, gameId)
    return this.command(userId, gameId, { id: commandId, expectedVersion: game.version, intent: { type: 'CONCEDE' } })
  }
  /** Statistics of the user's finished games, derived from stored results (no extra writes). */
  async stats(userId: string): Promise<PlayStats> {
    const out: PlayStats = { played: 0, wins: 0, losses: 0, concessions: 0, byDeck: {}, byLevel: {} }
    for (const g of await this.repo.finished(userId)) {
      if (!g.result) continue
      const won = g.result.winnerId === g.humanSeat
      out.played++; if (won) out.wins++; else out.losses++
      if (g.result.reason === 'CONCESSION' && g.result.loserIds.includes(g.humanSeat)) out.concessions++
      for (const [bucket, key] of [[out.byDeck, g.deckRef], [out.byLevel, g.botLevel]] as const) { bucket[key] ??= { played: 0, wins: 0 }; bucket[key].played++; if (won) bucket[key].wins++ }
    }
    return out
  }
  private async owned(userId: string, gameId: string): Promise<StoredGame> {
    const game = await this.repo.findById(gameId)
    // Another user's game is reported exactly like a missing one.
    if (!game || game.userId !== userId) throw new PlayError(404, 'GAME_NOT_FOUND')
    return game
  }
  // Commands are numbered by stored history: the engine records every accepted command in state.commands.
  private async nextSeq(game: StoredGame) { return game.state.commands.length + 1 }
}
