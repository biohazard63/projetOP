import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { assertLocalDatabase } from '../scripts/catalog/database'
const url = process.env.DATABASE_URL || ''
assertLocalDatabase(url, true)
const db = new PrismaClient({ datasourceUrl: url })
after(async () => db.$disconnect())
test('absent printed costs persist as NULL with original rule text, rollback preserves cards', async () => {
  const before = await db.card.count()
  await assert.rejects(db.$transaction(async tx => {
    for (const type of ['LEADER', 'EVENT']) {
      const id = `nullable-fixture:${randomUUID()}`
      const original = '[Jouée] Piochez 1 carte. Puis, défaussez 1 carte.'
      await tx.card.create({ data: { id, code: 'ZZ-NULL', name: 'Coût absent', type, color: 'Red', cost: null, rarity: 'C', imageUrl: '/fixture.png', effect: original } })
      const stored = await tx.card.findUniqueOrThrow({ where: { id } })
      assert.equal(stored.cost, null)
      assert.equal(stored.effect, original)
    }
    throw new Error('EXPECTED_NULL_COST_ROLLBACK')
  }), /EXPECTED_NULL_COST_ROLLBACK/)
  assert.equal(await db.card.count(), before)
})
