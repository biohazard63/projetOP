import { prisma } from '../prisma'
import type { Prisma } from '@prisma/client'
import { cardSelect, fingerprint, gameSelect, userSelect } from './data'
import type { AdminQuery, AdminResource } from './contracts'
import { getBoosterCatalog, getBoosterDrawContext, getOpening } from '../boosters/service'
import { adminOverview } from './overview'
import { readEconomySettings } from '../economy/settings'
import { legacyDefaultRules, resolveRules } from '../boosters/rules'
import { projectState } from '../../game/core/game'
import type { GameState } from '../../game/core/types'

const size = 25
const paging = (q: AdminQuery) => ({ take: size, skip: (q.page - 1) * size })
const result = (items: unknown[], total: number, q: AdminQuery) => ({ items, total, page: q.page, pages: Math.max(1, Math.ceil(total / size)) })
const dates = (q: AdminQuery) => ({ ...(q.from ? { gte: new Date(`${q.from}T00:00:00Z`) } : {}), ...(q.to ? { lt: new Date(new Date(`${q.to}T00:00:00Z`).getTime() + 86400000) } : {}) })
export async function adminRead(resource: AdminResource, q: AdminQuery, id?: string): Promise<unknown> {
  if (resource === 'overview') {
    return adminOverview()
  }
  if (resource === 'economy') {
    const settings = await readEconomySettings(prisma)
    return { ...settings, token: fingerprint(settings), id: 'economy' }
  }
  if (resource === 'users') {
    if (id) {
      const user = await prisma.user.findUnique({ where: { id }, select: userSelect }); if (!user) throw Error('NOT_FOUND')
      const where: Prisma.UserCardWhereInput = { userId: id, ...(q.q ? { card: { OR: [{ code: { contains: q.q, mode: 'insensitive' } }, { name: { contains: q.q, mode: 'insensitive' } }] } } : {}) }
      const [collection, total, movements, decks, badges, openings, games] = await Promise.all([
        prisma.userCard.findMany({ where, ...paging(q), orderBy: { cardId: 'asc' }, select: { cardId: true, quantity: true, card: { select: cardSelect } } }), prisma.userCard.count({ where }),
        prisma.berryTransaction.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 30, select: { id: true, amount: true, reason: true, balanceAfter: true, createdAt: true } }),
        prisma.deck.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 30, select: { id: true, name: true, versions: { orderBy: { createdAt: 'desc' }, take: 1, select: { name: true, cards: { select: { quantity: true, card: { select: { id: true, code: true, name: true } } } } } } } }),
        prisma.userBadge.findMany({ where: { userId: id }, select: { badgeId: true, level: true, unlockedAt: true } }), prisma.boosterOpening.count({ where: { userId: id } }), prisma.engineGame.count({ where: { userId: id } }),
      ])
      let lookup = null
      if (q.card) {
        const card = await prisma.card.findUnique({ where: { id: q.card }, select: { id: true, code: true, name: true } }); if (!card) throw Error('NOT_FOUND')
        const owned = await prisma.userCard.findUnique({ where: { userId_cardId: { userId: id, cardId: q.card } }, select: { quantity: true } })
        lookup = { card, cardId: q.card, quantity: owned?.quantity ?? 0, token: fingerprint({ cardId: q.card, quantity: owned?.quantity ?? 0 }) }
      }
      return { user, token: fingerprint({ berries: user.berries }), lookup, collection: result(collection.map(c => ({ ...c, token: fingerprint({ cardId: c.cardId, quantity: c.quantity }) })), total, q), movements, decks, badges, openings, games }
    }
    const where: Prisma.UserWhereInput = q.q ? { OR: [{ name: { contains: q.q, mode: 'insensitive' } }, { email: { contains: q.q, mode: 'insensitive' } }] } : {}
    const [items, total] = await Promise.all([prisma.user.findMany({ where, ...paging(q), orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: userSelect }), prisma.user.count({ where })]); return result(items, total, q)
  }
  if (resource === 'cards') {
    if (id) { const card = await prisma.card.findUnique({ where: { id }, select: cardSelect }); if (!card) throw Error('NOT_FOUND'); return { card, token: fingerprint(card) } }
    const where: Prisma.CardWhereInput = { ...(q.set ? { setCode: q.set } : {}), ...(q.rarity ? { rarity: q.rarity } : {}), ...(q.type ? { type: q.type } : {}), ...(q.variant === 'alt' ? { isAltArt: true } : q.variant === 'parallel' ? { isParallel: true } : q.variant === 'special' ? { isSpecial: true } : q.variant === 'standard' ? { isAltArt: false, isParallel: false, isSpecial: false } : {}), ...(q.q ? { OR: [{ code: { contains: q.q, mode: 'insensitive' } }, { name: { contains: q.q, mode: 'insensitive' } }] } : {}) }
    const [items, total] = await Promise.all([prisma.card.findMany({ where, ...paging(q), orderBy: [{ code: 'asc' }, { id: 'asc' }], select: cardSelect }), prisma.card.count({ where })]); return result(items, total, q)
  }
  if (resource === 'sets') {
    if (id) {
      const set = await prisma.cardSet.findUnique({ where: { code: id } }); if (!set) throw Error('NOT_FOUND')
      const rules = await prisma.setRules.findUnique({ where: { code: id } })
      const catalog = (await getBoosterCatalog(prisma)).find(row => row.code === id)
      let resolvedRules = legacyDefaultRules
      let integrated = false, draft = false
      try { const ctx = await getBoosterDrawContext(prisma, id); resolvedRules = ctx.rules; integrated = ctx.tiered } catch { draft = true; try { resolvedRules = resolveRules(rules?.boosterRules).rules } catch { /* Explicitly labelled repair draft. */ } }
      return { set, token: fingerprint(set), rules: rules?.boosterRules ?? null, resolvedRules, integrated, draft, rulesToken: fingerprint(rules), diagnostic: catalog ?? null }
    }
    const where: Prisma.CardSetWhereInput = q.q ? { OR: [{ code: { contains: q.q, mode: 'insensitive' } }, { name: { contains: q.q, mode: 'insensitive' } }] } : {}
    const [items, total] = await Promise.all([prisma.cardSet.findMany({ where, ...paging(q), orderBy: { code: 'asc' }, include: { _count: { select: { cards: true } } } }), prisma.cardSet.count({ where })]); return result(items, total, q)
  }
  if (resource === 'openings') {
    if (id) { const row = await prisma.boosterOpening.findUnique({ where: { id }, select: { userId: true } }); if (!row) throw Error('NOT_FOUND'); return { opening: await getOpening(prisma, row.userId, id) } }
    const where: Prisma.BoosterOpeningWhereInput = { ...(q.user ? { userId: q.user } : {}), ...(q.set ? { booster: { setCode: q.set } } : {}), ...(q.from || q.to ? { openedAt: dates(q) } : {}), ...(q.q ? { OR: [{ id: { contains: q.q } }, { user: { email: { contains: q.q, mode: 'insensitive' } } }, { booster: { setCode: { contains: q.q, mode: 'insensitive' } } }] } : {}) }
    const [items, total] = await Promise.all([prisma.boosterOpening.findMany({ where, ...paging(q), orderBy: [{ openedAt: 'desc' }, { id: 'desc' }], select: { id: true, userId: true, openedAt: true, creditedAt: true, displayId: true, berryTransactionId: true, booster: { select: { setCode: true, name: true } }, user: { select: { name: true, email: true } }, _count: { select: { cards: true } } } }), prisma.boosterOpening.count({ where })]); return result(items, total, q)
  }
  if (resource === 'games') {
    if (id) {
      const row = await prisma.engineGame.findUnique({ where: { id }, select: { ...gameSelect, state: true, humanSeat: true, commands: { take: 50, orderBy: { seq: 'desc' }, select: { id: true, type: true, actorSeat: true, resultVersion: true, createdAt: true } } } }); if (!row) throw Error('NOT_FOUND')
      const { state, humanSeat, ...metadata } = row
      return { game: metadata, projection: projectState(state as unknown as GameState, humanSeat) }
    }
    const where: Prisma.EngineGameWhereInput = { ...(q.user ? { userId: q.user } : {}), ...(q.status ? { status: q.status } : {}), ...(q.level ? { botLevel: q.level } : {}), ...(q.from || q.to ? { createdAt: dates(q) } : {}), ...(q.q ? { OR: [{ id: { contains: q.q } }, { user: { email: { contains: q.q, mode: 'insensitive' } } }] } : {}) }
    const [items, total] = await Promise.all([prisma.engineGame.findMany({ where, ...paging(q), orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: gameSelect }), prisma.engineGame.count({ where })]); return result(items, total, q)
  }
  const where: Prisma.AdminAuditLogWhereInput = q.q ? { OR: [{ targetId: { contains: q.q } }, { action: { contains: q.q } }, { reason: { contains: q.q, mode: 'insensitive' } }, { actorId: { contains: q.q } }] } : {}
  if (id) { const row = await prisma.adminAuditLog.findUnique({ where: { id } }); if (!row) throw Error('NOT_FOUND'); return row }
  const [items, total] = await Promise.all([prisma.adminAuditLog.findMany({ where, ...paging(q), orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }), prisma.adminAuditLog.count({ where })]); return result(items, total, q)
}
