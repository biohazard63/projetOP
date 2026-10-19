import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Card } from '@prisma/client'
import { CATALOG_TTL, catalogById, catalogCards, invalidateCatalog } from '../src/lib/catalog/cache'
import { validateDeck } from '../src/lib/deckValidation'

const card = (id: string, extra: Partial<Card> = {}) => ({ id, code: id, name: id, type: 'CHARACTER', color: 'Red', ...extra }) as Card
function fakeDb(rows: Card[]) {
  let reads = 0
  return { db: { card: { findMany: async () => { reads++; return rows } } }, reads: () => reads }
}

test('The catalogue is read once, shared by concurrent calls and served from memory until it expires', async () => {
  const { db, reads } = fakeDb([card('B'), card('A')])
  const [a, b] = await Promise.all([catalogCards(db), catalogCards(db)])
  assert.equal(reads(), 1, 'one database read for concurrent calls')
  assert.equal(a, b)
  assert.deepEqual(a.map(c => c.id), ['A', 'B'], 'sorted by identifier')
  for (let i = 0; i < 50; i++) await catalogCards(db)
  assert.equal((await catalogById(db)).get('B')?.id, 'B')
  assert.equal(reads(), 1, 'later visits do not read the database')
  const now = Date.now, later = now() + CATALOG_TTL + 1
  Date.now = () => later
  try { await catalogCards(db); assert.equal(reads(), 2, 'read again once expired') } finally { Date.now = now }
})

test('An admin edit drops the catalogue at once, and a failed read is never kept', async () => {
  const { db, reads } = fakeDb([card('A')])
  await catalogCards(db); invalidateCatalog(); await catalogCards(db)
  assert.equal(reads(), 2)
  let fail = true
  const flaky = { card: { findMany: async () => { if (fail) throw new Error('down'); return [card('A')] } } }
  await assert.rejects(catalogCards(flaky))
  fail = false
  assert.equal((await catalogCards(flaky)).length, 1, 'the next call reads again')
})

test('A deck may hold cards whose type is stored in French', () => {
  const others = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
  const stored = [card('L', { type: 'LEADER' }), card('P', { type: 'PERSONNAGE' }), card('E', { type: 'ÉVÉNEMENTS' }), card('S', { type: 'LIEU' }), ...others.map(id => card(id))]
  // 3 × 4 French-typed cards + 9 × 4 + 2 = 50 cards besides the Leader.
  const cards = [{ id: 'L', quantity: 1 }, { id: 'P', quantity: 4 }, { id: 'E', quantity: 4 }, { id: 'S', quantity: 4 }, ...others.map((id, i) => ({ id, quantity: i < 9 ? 4 : 2 }))]
  assert.equal(validateDeck(cards, stored), null)
  assert.equal(validateDeck(cards, stored.map(c => c.id === 'P' ? card('P', { type: 'DON' }) : c)), 'Type de carte interdit')
})
