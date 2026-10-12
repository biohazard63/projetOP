import type { PrismaClient } from '@prisma/client'
import { rateLimit } from '../security'
import { bridgeCards, type PrismaCardRow } from './catalog'
import { REFERENCE_DECKS, deckEligibility, userDeckEntries } from './decks'
import { PlayError, PlayService, startRequest, type DeckChoice } from './service'

// Framework-free handlers for /api/play/*: the route files only resolve the session and call these. The
// user id always comes from the server session; nothing in a request body can choose a seat or a player.
export type Reply = { status: number; body: unknown }
export const NO_STORE = { 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' }
export type UserDeck = { id: string; name: string; cards: { cardId: string; quantity: number }[] }
export interface DeckSource {
  userDecks(userId: string): Promise<UserDeck[]>
  cardRows(cardIds: string[]): Promise<PrismaCardRow[]>
  /** Distinct cards owned by the user (read-only). */
  ownedCardRows?(userId: string): Promise<PrismaCardRow[]>
}
export class PrismaDeckSource implements DeckSource {
  constructor(private readonly db: PrismaClient) {}
  // Read-only: the latest DeckVersion of each deck, as /api/decks shows it.
  async userDecks(userId: string): Promise<UserDeck[]> {
    const decks = await this.db.deck.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, include: { versions: { orderBy: { createdAt: 'desc' }, take: 1, include: { cards: { select: { cardId: true, quantity: true } } } } } })
    return decks.map(d => ({ id: d.id, name: d.name, cards: d.versions[0]?.cards ?? [] }))
  }
  async ownedCardRows(userId: string): Promise<PrismaCardRow[]> {
    const owned = await this.db.userCard.findMany({ where: { userId, quantity: { gt: 0 } }, select: { cardId: true }, take: 5000 })
    return this.cardRows(owned.map(o => o.cardId))
  }
  async cardRows(cardIds: string[]): Promise<PrismaCardRow[]> {
    if (!cardIds.length) return []
    return this.db.card.findMany({ where: { id: { in: [...new Set(cardIds)] } }, select: { id: true, code: true, name: true, type: true, color: true, cost: true, power: true, counter: true, imageUrl: true, isAltArt: true, isParallel: true, isSpecial: true } })
  }
}

async function guard(userId: string | null, action: string, limit: number, run: (userId: string) => Promise<Reply>): Promise<Reply> {
  if (!userId) return { status: 401, body: { error: 'UNAUTHENTICATED' } }
  if (!rateLimit(`play:${action}:${userId}`, limit, 60_000).allowed) return { status: 429, body: { error: 'RATE_LIMITED' } }
  try { return await run(userId) } catch (e) {
    if (e instanceof PlayError) return { status: e.status, body: { error: e.code, ...(e.detail ?? {}) } }
    console.error('play route failure', { action, type: e instanceof Error ? e.name : 'unknown' }) // no message: it may carry state
    return { status: 500, body: { error: 'SERVER_ERROR' } }
  }
}
async function userDeckChoice(userId: string, deckId: string, source: DeckSource, decks?: UserDeck[]): Promise<DeckChoice & { name: string; errors: string[] }> {
  const deck = (decks ?? await source.userDecks(userId)).find(d => d.id === deckId)
  if (!deck) throw new PlayError(404, 'DECK_NOT_FOUND')
  const bridge = bridgeCards(await source.cardRows(deck.cards.map(c => c.cardId)))
  const { entries, errors } = userDeckEntries(deck.cards, bridge)
  return { ref: `user:${deck.id}`, name: deck.name, entries, printings: bridge.printings, errors }
}

export const playHandlers = {
  async decks(userId: string | null, source: DeckSource): Promise<Reply> {
    return guard(userId, 'decks', 60, async uid => {
      const reference = REFERENCE_DECKS.map(d => ({ id: d.id, name: d.name, leader: d.leader, description: d.description, ...deckEligibility(d.entries) }))
      const user = []
      const decks = await source.userDecks(uid)
      for (const deck of decks) {
        const choice = await userDeckChoice(uid, deck.id, source, decks)
        const eligibility = choice.errors.length ? { ok: false, errors: choice.errors } : deckEligibility(choice.entries, choice.printings)
        user.push({ id: deck.id, name: deck.name, ...eligibility })
      }
      // Owned cards vs engine compatibility: recognised (reviewed definition, data agrees) and certified.
      const owned = source.ownedCardRows ? await source.ownedCardRows(uid) : []
      const bridge = bridgeCards(owned), recognised = owned.filter(r => bridge.byCardId.has(r.id))
      const certified = recognised.filter(r => bridge.display[bridge.byCardId.get(r.id)!]?.certified)
      return { status: 200, body: { reference, user, collection: { owned: owned.length, recognised: recognised.length, certified: certified.length } } }
    })
  },
  async start(userId: string | null, body: unknown, service: PlayService, source: DeckSource): Promise<Reply> {
    return guard(userId, 'start', 10, async uid => {
      const parsed = startRequest.safeParse(body)
      if (!parsed.success) throw new PlayError(400, 'INVALID_START')
      const choice = parsed.data.deck
      let deck: DeckChoice
      if (choice.kind === 'reference') {
        const ref = REFERENCE_DECKS.find(d => d.id === choice.id)
        if (!ref) throw new PlayError(404, 'DECK_NOT_FOUND')
        deck = { ref: ref.id, entries: structuredClone(ref.entries) }
      } else {
        const user = await userDeckChoice(uid, choice.deckId, source)
        if (user.errors.length) throw new PlayError(422, 'DECK_NOT_PLAYABLE', { errors: user.errors })
        deck = user
      }
      return { status: 201, body: { game: await service.start(uid, deck, parsed.data.botLevel ?? 'normal') } }
    })
  },
  async stats(userId: string | null, service: PlayService): Promise<Reply> {
    return guard(userId, 'read', 240, async uid => ({ status: 200, body: { stats: await service.stats(uid) } }))
  },
  async active(userId: string | null, service: PlayService): Promise<Reply> {
    return guard(userId, 'read', 240, async uid => ({ status: 200, body: { game: await service.active(uid) } }))
  },
  async view(userId: string | null, gameId: string, since: string | null, service: PlayService): Promise<Reply> {
    return guard(userId, 'read', 240, async uid => {
      const sinceEvent = since === null ? 0 : Number(since)
      if (!Number.isSafeInteger(sinceEvent) || sinceEvent < 0) throw new PlayError(400, 'INVALID_SINCE')
      return { status: 200, body: { game: await service.view(uid, gameId, sinceEvent) } }
    })
  },
  async command(userId: string | null, gameId: string, body: unknown, service: PlayService): Promise<Reply> {
    return guard(userId, 'command', 600, async uid => {
      const { view, replayed } = await service.command(uid, gameId, body)
      return { status: 200, body: { game: view, replayed } }
    })
  },
  async concede(userId: string | null, gameId: string, body: unknown, service: PlayService): Promise<Reply> {
    return guard(userId, 'command', 600, async uid => {
      const id = body && typeof body === 'object' && 'id' in body ? (body as { id: unknown }).id : undefined
      if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new PlayError(400, 'INVALID_COMMAND')
      const { view, replayed } = await service.concede(uid, gameId, id)
      return { status: 200, body: { game: view, replayed } }
    })
  },
}
