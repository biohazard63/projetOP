import test from 'node:test'
import assert from 'node:assert/strict'
import type { PrismaClient } from '@prisma/client'
import { adminHandlers } from '../src/lib/admin/http'
import { adminWrite } from '../src/lib/admin/write'
import { fingerprint } from '../src/lib/admin/data'
import { currentEconomy } from '../src/lib/economy/settings'
import { ECONOMY } from '../src/lib/economy/config'
import { post, postMany } from '../src/lib/economy/ledger'
import { activityDays } from '../src/lib/admin/overview'

test('all admin reads and writes require a server-authorized account', async () => {
  let calls = 0
  for (const session of [null, { user: { id: 'ordinary', email: 'player@example.test' } }]) {
    const handle = adminHandlers({ session: async () => session, allow: () => true, read: async () => { calls++; return {} }, write: async () => { calls++; return {} } })
    assert.ok([401, 403].includes((await handle(new Request('http://localhost/api/admin/users'), 'users')).status))
    assert.ok([401, 403].includes((await handle(new Request('http://localhost/api/admin/cards', { method: 'PATCH', body: '{}' }), 'cards')).status))
  }
  assert.equal(calls, 0)
})
test('authorized admin cannot bypass origin, filters or resource/action validation', async () => {
  const previous = process.env.REPORT_ADMIN_EMAILS; process.env.REPORT_ADMIN_EMAILS = 'owner@example.test'
  try {
    let writes = 0
    const handle = adminHandlers({ session: async () => ({ user: { id: 'admin', email: 'owner@example.test' } }), allow: () => true, read: async (_r, q) => ({ page: q.page }), write: async () => { writes++; return {} } })
    const action = { type: 'USER_BERRIES', id: 'user', amount: 50, requestId: 'one', reason: 'Correction de test', expected: 'hash' }
    assert.equal((await handle(new Request('http://localhost/api/admin/users', { method: 'PATCH', headers: { origin: 'http://other.test' }, body: JSON.stringify(action) }), 'users')).status, 403)
    assert.equal((await handle(new Request('http://localhost/api/admin/cards', { method: 'PATCH', body: JSON.stringify(action) }), 'cards')).status, 400)
    assert.equal((await handle(new Request('http://localhost/api/admin/users?page=-2'), 'users')).status, 400)
    assert.equal((await handle(new Request('http://localhost/api/admin/users?page=2'), 'users')).status, 200)
    assert.equal(writes, 0)
  } finally { if (previous === undefined) delete process.env.REPORT_ADMIN_EMAILS; else process.env.REPORT_ADMIN_EMAILS = previous }
})
function fixture() {
  let balance = 100, ledger: unknown[] = [], audit: Record<string, unknown>[] = [], failAudit = false
  const tx = {
    $executeRaw: async () => 1,
    user: { findUnique: async () => ({ berries: balance }), updateMany: async ({ where, data }: { where: { berries: number }; data: { berries: number } }) => { if (where.berries !== balance) return { count: 0 }; balance = data.berries; return { count: 1 } } },
    berryTransaction: { create: async ({ data }: { data: unknown }) => { ledger.push(data); return data } },
    adminAuditLog: { findUnique: async ({ where }: { where: { actorId_requestId: { actorId: string; requestId: string } } }) => audit.find(v => v.actorId === where.actorId_requestId.actorId && v.requestId === where.actorId_requestId.requestId) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => { if (failAudit) throw Error('AUDIT_FAILURE'); const row = { id: 'log', ...data }; audit.push(row); return row } },
  }
  const db = { $transaction: async (run: (value: unknown) => Promise<unknown>) => { const before = { balance, ledger: [...ledger], audit: [...audit] }; try { return await run(tx) } catch (e) { balance = before.balance; ledger = before.ledger; audit = before.audit; throw e } } } as unknown as PrismaClient
  return { db, state: () => ({ balance, ledger, audit }), failAudit: () => { failAudit = true } }
}
const berryAction = (expected = fingerprint({ berries: 100 })) => ({ type: 'USER_BERRIES', id: 'user', requestId: 'one', reason: 'Correction de test', expected, amount: 50 })
test('Berry adjustment is exactly once, logged, and does not grant a starter purse', async () => {
  const { db, state } = fixture()
  await adminWrite(db, 'admin', berryAction())
  assert.equal(state().balance, 150)
  assert.equal(state().ledger.length, 1)
  assert.equal(state().audit.length, 1)
  assert.equal((await adminWrite(db, 'admin', berryAction())).replayed, true)
  assert.equal(state().balance, 150)
  await assert.rejects(adminWrite(db, 'admin', { ...berryAction(), amount: 60 }), /REQUEST_CONFLICT/)
})
test('conflicts, negative balances and audit failures do not leave a partial credit', async () => {
  const { db, state, failAudit } = fixture()
  await assert.rejects(adminWrite(db, 'admin', berryAction('stale')), /EDIT_CONFLICT/)
  await assert.rejects(adminWrite(db, 'admin', { ...berryAction(), amount: -200 }), /INSUFFICIENT_BERRIES/)
  failAudit(); await assert.rejects(adminWrite(db, 'admin', berryAction()), /AUDIT_FAILURE/)
  assert.deepEqual(state(), { balance: 100, ledger: [], audit: [] })
})
test('active database economy settings affect both displayed prices and rewards', async () => {
  const value = { ...ECONOMY, starterGrant: 12345, prices: { booster: 500, display: 9000 }, rewards: { ...ECONOMY.rewards, dailyTreasure: 777 } }
  const db = { $queryRaw: async () => [{ present: true }], adminSetting: { findUnique: async () => ({ value, revision: 2, updatedAt: new Date() }) } } as unknown as PrismaClient
  const economy = await currentEconomy(db)
  assert.equal(economy.prices.booster, 500); assert.equal(economy.prices.display, 9000); assert.equal(economy.starterGrant, 12345); assert.equal(economy.rewards.dailyTreasure, 777)
  const absent = { $queryRaw: async () => [{ present: false }], adminSetting: { findUnique: async () => { throw Error('Must not query an absent table inside a transaction') } } } as unknown as PrismaClient
  assert.equal((await currentEconomy(absent)).starterGrant, ECONOMY.starterGrant)
})
test('large credits and batches fail with a business error before overflowing PostgreSQL Int', async () => {
  const tx = { user: { findUnique: async () => ({ berries: 2147483640 }), update: async () => { throw Error('Must not write') } }, berryTransaction: { findUnique: async ({ where }: { where: { userId_idempotencyKey: { idempotencyKey: string } } }) => where.userId_idempotencyKey.idempotencyKey === 'starter-grant' ? { id: 'starter' } : null, findMany: async () => [], createManyAndReturn: async () => { throw Error('Must not write') } } } as unknown as Parameters<typeof post>[0]
  await assert.rejects(post(tx, 'user', { amount: 100, reason: 'DUPLICATE_SALE', key: 'overflow' }), (e: unknown) => e instanceof Error && 'code' in e && e.code === 'BALANCE_LIMIT')
  await assert.rejects(postMany(tx, 'user', [{ amount: 100, reason: 'DUPLICATE_SALE', key: 'overflow' }]), (e: unknown) => e instanceof Error && 'code' in e && e.code === 'BALANCE_LIMIT')
})
test('overview provides 14 Paris calendar days, real counts and explicit zero-activity days', () => {
  const days = activityDays(new Date('2026-10-18T22:30:00Z'), [{ day: '2026-10-19', value: 3 }], [{ day: '2026-10-18', value: 12 }], [])
  assert.equal(days.length, 14); assert.equal(days.at(-1)?.day, '2026-10-19'); assert.equal(days.at(-1)?.users, 3); assert.equal(days.at(-2)?.openings, 12)
  assert.ok(days.every(d => d.games === 0))
})
