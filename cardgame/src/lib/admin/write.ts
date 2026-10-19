import { Prisma, type PrismaClient } from '@prisma/client'
import { adminAction, adjustedBalance, type AdminAction } from './contracts'
import { asJson, cardSelect, fingerprint } from './data'
import { lockPlayer } from '../economy/ledger'
import { readEconomySettings } from '../economy/settings'
import { getBoosterDrawContext } from '../boosters/service'
import { invalidateCatalog } from '@/lib/catalog/cache'

function unchanged(value: unknown, expected: string) { if (fingerprint(value) !== expected) throw Error('EDIT_CONFLICT') }
export async function adminWrite(db: PrismaClient, actorId: string, raw: unknown) {
  const action = adminAction.parse(raw)
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`admin-request:${actorId}:${action.requestId}`}, 0))`
    const requestHash = fingerprint(action)
    const replay = await tx.adminAuditLog.findUnique({ where: { actorId_requestId: { actorId, requestId: action.requestId } } })
    if (replay) { if (replay.requestHash !== requestHash) throw Error('REQUEST_CONFLICT'); return { id: replay.id, after: replay.after, replayed: true } }
    if (action.type.startsWith('USER_')) await lockPlayer(tx, action.id)
    else await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`admin-resource:${action.type}:${action.id}`}, 0))`
    const { before, after } = await apply(tx, actorId, action)
    const log = await tx.adminAuditLog.create({ data: { actorId, requestId: action.requestId, requestHash, action: action.type, targetId: action.id, reason: action.reason, before: asJson(before), after: asJson(after) } })
    return { id: log.id, after, replayed: false }
  }, { maxWait: 10000, timeout: 30000, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted })
}
async function apply(tx: Prisma.TransactionClient, actorId: string, action: AdminAction): Promise<{ before: unknown; after: unknown }> {
  if (action.type === 'USER_BERRIES') {
    const user = await tx.user.findUnique({ where: { id: action.id }, select: { berries: true } }); if (!user) throw Error('NOT_FOUND')
    unchanged(user, action.expected)
    const after = { berries: adjustedBalance(user.berries, action.amount) }
    const result = await tx.user.updateMany({ where: { id: action.id, berries: user.berries }, data: after }); if (!result.count) throw Error('EDIT_CONFLICT')
    // Administrative adjustment never triggers the unrelated starter grant.
    await tx.berryTransaction.create({ data: { userId: action.id, amount: action.amount, balanceAfter: after.berries, reason: 'ADMIN_ADJUSTMENT', idempotencyKey: `admin:${actorId}:${action.requestId}`, details: { actorId, reason: action.reason } } })
    return { before: user, after }
  }
  if (action.type === 'USER_COLLECTION') {
    const [user, card, owned] = await Promise.all([tx.user.findUnique({ where: { id: action.id }, select: { id: true } }), tx.card.findUnique({ where: { id: action.cardId }, select: { id: true } }), tx.userCard.findUnique({ where: { userId_cardId: { userId: action.id, cardId: action.cardId } } })])
    if (!user || !card) throw Error('NOT_FOUND')
    const before = { cardId: action.cardId, quantity: owned?.quantity ?? 0 }; unchanged(before, action.expected)
    const required = await tx.deckCard.aggregate({ where: { cardId: action.cardId, deckVersion: { deck: { userId: action.id } } }, _max: { quantity: true } })
    if (action.quantity < (required._max.quantity ?? 0)) throw Error('CARD_USED_IN_DECK')
    if (owned) {
      const result = await tx.userCard.updateMany({ where: { id: owned.id, quantity: before.quantity }, data: { quantity: action.quantity } }); if (!result.count) throw Error('EDIT_CONFLICT')
    } else await tx.userCard.create({ data: { userId: action.id, cardId: action.cardId, quantity: action.quantity } })
    return { before, after: { cardId: action.cardId, quantity: action.quantity } }
  }
  if (action.type === 'CARD_EDIT') {
    const before = await tx.card.findUnique({ where: { id: action.id }, select: cardSelect }); if (!before) throw Error('NOT_FOUND'); unchanged(before, action.expected)
    if (action.changes.imageUrl === null) throw Error('INVALID_ACTION')
    const changes = { ...action.changes, imageUrl: action.changes.imageUrl ?? undefined }
    const result = await tx.card.updateMany({ where: before, data: changes }); if (!result.count) throw Error('EDIT_CONFLICT')
    invalidateCatalog()
    return { before, after: { ...before, ...action.changes } }
  }
  if (action.type === 'SET_EDIT') {
    const before = await tx.cardSet.findUnique({ where: { code: action.id } }); if (!before) throw Error('NOT_FOUND'); unchanged(before, action.expected)
    const result = await tx.cardSet.updateMany({ where: before, data: action.changes }); if (!result.count) throw Error('EDIT_CONFLICT')
    return { before, after: { ...before, ...action.changes } }
  }
  if (action.type === 'RULES_EDIT') {
    const before = await tx.setRules.findUnique({ where: { code: action.id } }); unchanged(before, action.expected)
    let integrated = false
    try { integrated = (await getBoosterDrawContext(tx, action.id)).tiered } catch { /* Broken explicit rules remain repairable. */ }
    if (integrated) throw Error('INTEGRATED_RULES')
    // The same product validator as a real opening, with the proposed rules (even if old rules are invalid).
    await getBoosterDrawContext(tx, action.id, action.rules)
    const after = await tx.setRules.upsert({ where: { code: action.id }, create: { code: action.id, rarityCounts: {}, typeCounts: {}, boosterRules: asJson(action.rules) }, update: { boosterRules: asJson(action.rules) } })
    return { before, after }
  }
  const before = await readEconomySettings(tx); unchanged(before, action.expected)
  const after = await tx.adminSetting.upsert({ where: { id: 'economy' }, create: { id: 'economy', revision: 1, value: asJson(action.settings) }, update: { revision: { increment: 1 }, value: asJson(action.settings) } })
  return { before, after: { revision: after.revision, value: after.value, updatedAt: after.updatedAt } }
}
