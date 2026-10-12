import type { Prisma, PrismaClient } from '@prisma/client'
import type { GameState } from '../../game/core/types'

// Persistence of server-authoritative engine games. `state` is the full engine GameState and must only be
// read by the server: no API returns it. Every write is conditional on the stored version (compare-and-set),
// so two tabs sending commands from the same version cannot both win.
export type GameStatus = 'ACTIVE' | 'FINISHED'
export type StoredGame = { id: string; userId: string; status: GameStatus; humanSeat: string; botSeat: string; deckRef: string; botDeckRef: string; botLevel: string; rulesetId: string; engineVersion: string; version: number; state: GameState; result: GameState['result'] | null }
export type StoredCommand = { seq: number; commandId: string; actorSeat: string; type: string; payload: unknown; resultVersion: number }
export type GameUpdate = { version: number; state: GameState; status: GameStatus; result: GameState['result'] | null }
export interface GameRepository {
  findActive(userId: string): Promise<StoredGame | null>
  findById(id: string): Promise<StoredGame | null>
  /** Creates the game unless the user already has an active one (returns null then). */
  create(game: Omit<StoredGame, 'id'>, commands: StoredCommand[]): Promise<StoredGame | null>
  /** Writes `next` and appends `commands` only if the stored version is still `expectedVersion`. */
  commit(id: string, expectedVersion: number, next: GameUpdate, commands: StoredCommand[]): Promise<boolean>
  findCommand(gameId: string, commandId: string): Promise<StoredCommand | null>
  /** Summary rows of the user's finished games (statistics); never the state. */
  finished(userId: string): Promise<FinishedGame[]>
}
export type FinishedGame = { deckRef: string; botLevel: string; result: GameState['result'] | null; humanSeat: string }

export class MemoryGameRepository implements GameRepository {
  games = new Map<string, StoredGame>(); commands = new Map<string, StoredCommand[]>(); private serial = 0
  async findActive(userId: string) { return structuredClone([...this.games.values()].find(g => g.userId === userId && g.status === 'ACTIVE') ?? null) }
  async findById(id: string) { return structuredClone(this.games.get(id) ?? null) }
  async create(game: Omit<StoredGame, 'id'>, commands: StoredCommand[]) {
    if ([...this.games.values()].some(g => g.userId === game.userId && g.status === 'ACTIVE')) return null
    const stored = { ...structuredClone(game), id: `game-${++this.serial}` }
    this.games.set(stored.id, stored); this.commands.set(stored.id, structuredClone(commands))
    return structuredClone(stored)
  }
  async commit(id: string, expectedVersion: number, next: GameUpdate, commands: StoredCommand[]) {
    const game = this.games.get(id)
    if (!game || game.version !== expectedVersion) return false
    Object.assign(game, structuredClone(next)); this.commands.get(id)!.push(...structuredClone(commands))
    return true
  }
  async findCommand(gameId: string, commandId: string) { return structuredClone(this.commands.get(gameId)?.find(c => c.commandId === commandId) ?? null) }
  async finished(userId: string) { return [...this.games.values()].filter(g => g.userId === userId && g.status === 'FINISHED').map(g => ({ deckRef: g.deckRef, botLevel: g.botLevel, result: structuredClone(g.result), humanSeat: g.humanSeat })) }
}

type Row = { id: string; userId: string; status: string; humanSeat: string; botSeat: string; deckRef: string; botDeckRef: string; botLevel: string; rulesetId: string; engineVersion: string; version: number; state: Prisma.JsonValue; result: Prisma.JsonValue | null }
const fromRow = (row: Row): StoredGame => ({ ...row, status: row.status === 'FINISHED' ? 'FINISHED' : 'ACTIVE', state: row.state as unknown as GameState, result: (row.result ?? null) as unknown as StoredGame['result'] })
const json = (value: unknown) => value as Prisma.InputJsonValue
const commandRows = (gameId: string, commands: StoredCommand[]) => commands.map(c => ({ gameId, seq: c.seq, commandId: c.commandId, actorSeat: c.actorSeat, type: c.type, payload: json(c.payload), resultVersion: c.resultVersion }))

export class PrismaGameRepository implements GameRepository {
  constructor(private readonly db: PrismaClient) {}
  async findActive(userId: string) {
    const row = await this.db.engineGame.findFirst({ where: { userId, status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } })
    return row ? fromRow(row) : null
  }
  async findById(id: string) {
    const row = await this.db.engineGame.findUnique({ where: { id } })
    return row ? fromRow(row) : null
  }
  async create(game: Omit<StoredGame, 'id'>, commands: StoredCommand[]) {
    return this.db.$transaction(async tx => {
      if (await tx.engineGame.findFirst({ where: { userId: game.userId, status: 'ACTIVE' }, select: { id: true } })) return null
      const row = await tx.engineGame.create({ data: { ...game, state: json(game.state), result: game.result === null ? undefined : json(game.result) } })
      if (commands.length) await tx.engineCommand.createMany({ data: commandRows(row.id, commands) })
      return fromRow(row)
    }, { isolationLevel: 'Serializable' })
  }
  async commit(id: string, expectedVersion: number, next: GameUpdate, commands: StoredCommand[]) {
    try {
      return await this.db.$transaction(async tx => {
        const updated = await tx.engineGame.updateMany({ where: { id, version: expectedVersion }, data: { version: next.version, state: json(next.state), status: next.status,
          result: next.result === null ? undefined : json(next.result), finishedAt: next.status === 'FINISHED' ? new Date() : undefined } })
        if (updated.count !== 1) throw new StaleVersion()
        if (commands.length) await tx.engineCommand.createMany({ data: commandRows(id, commands) })
        return true
      })
    } catch (e) {
      if (e instanceof StaleVersion) return false
      // A concurrent writer already stored the same (gameId, seq/commandId): the version moved on.
      if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002') return false
      throw e
    }
  }
  async findCommand(gameId: string, commandId: string) {
    const row = await this.db.engineCommand.findUnique({ where: { gameId_commandId: { gameId, commandId } } })
    return row ? { seq: row.seq, commandId: row.commandId, actorSeat: row.actorSeat, type: row.type, payload: row.payload, resultVersion: row.resultVersion } : null
  }
  async finished(userId: string) {
    const rows = await this.db.engineGame.findMany({ where: { userId, status: 'FINISHED' }, select: { deckRef: true, botLevel: true, result: true, humanSeat: true }, orderBy: { finishedAt: 'desc' }, take: 500 })
    return rows.map(r => ({ deckRef: r.deckRef, botLevel: r.botLevel, humanSeat: r.humanSeat, result: (r.result ?? null) as unknown as FinishedGame['result'] }))
  }
}
class StaleVersion extends Error {}
