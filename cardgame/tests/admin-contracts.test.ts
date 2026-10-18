import test from 'node:test'
import assert from 'node:assert/strict'
import { adminAction, adminQuery, adjustedBalance } from '../src/lib/admin/contracts'

const base = { requestId: 'request-1', reason: 'Correction demandée par le joueur', expected: 'abc123' }
test('admin adjustments require an explicit reason, bounded amount and optimistic token', () => {
  const action = { ...base, type: 'USER_BERRIES', id: 'user', amount: 500 }
  assert.equal(adminAction.safeParse(action).success, true)
  for (const data of [{ ...action, amount: 0 }, { ...action, amount: 1.1 }, { ...action, amount: 3000000000 }, { ...action, reason: ' ' }, { ...action, expected: '' }]) assert.equal(adminAction.safeParse(data).success, false)
  assert.equal(adjustedBalance(1000, -500), 500)
  assert.throws(() => adjustedBalance(100, -200), /INSUFFICIENT_BERRIES/)
  assert.throws(() => adjustedBalance(2147483647, 1), /BALANCE_LIMIT/)
})
test('card edits cannot change identity, ownership, certification or unexpected fields', () => {
  const action = { ...base, type: 'CARD_EDIT', id: 'card', changes: { name: 'Nom corrigé', isAltArt: false } }
  assert.equal(adminAction.safeParse(action).success, true)
  for (const changes of [{ code: 'OTHER' }, { id: 'other' }, { certified: true }, { imageUrl: 'javascript:alert(1)' }, { cost: -1 }, {}]) assert.equal(adminAction.safeParse({ ...action, changes }).success, false)
})
test('collection corrections reject negative quantities and unknown actions', () => {
  assert.equal(adminAction.safeParse({ ...base, type: 'USER_COLLECTION', id: 'user', cardId: 'card', quantity: 0 }).success, true)
  assert.equal(adminAction.safeParse({ ...base, type: 'USER_COLLECTION', id: 'user', cardId: 'card', quantity: -1 }).success, false)
  assert.equal(adminAction.safeParse({ ...base, type: 'DELETE_ALL', id: 'user' }).success, false)
})
test('list queries bound page size and validate source, status and dates', () => {
  assert.equal(adminQuery.safeParse({ q: 'ST01', page: '2' }).success, true)
  for (const data of [{ page: '-1' }, { page: 'NaN' }, { q: 'x'.repeat(121) }, { from: 'invalid' }, { variant: 'invalid' }]) assert.equal(adminQuery.safeParse(data).success, false)
})
