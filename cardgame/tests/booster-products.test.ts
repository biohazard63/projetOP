import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isBoosterProduct } from '../src/lib/boosters/products'
import { getBoosterDrawContext } from '../src/lib/boosters/service'
import type { Prisma } from '@prisma/client'

test('booster families include OP, combined OP/EB, EB and PRB only', () => {
  for (const code of ['OP-01', 'OP-17', 'OP14-EB04', 'OP15-EB04', 'EB-03', 'PRB-02', 'op-13']) assert.equal(isBoosterProduct(code), true, code)
  for (const code of ['ST-01', 'ST-36', 'PROMO', 'GC-01', 'OTHER', 'PREMIUM', 'OP-TEST', 'OP-13junk', 'OP14-EB04-ST01']) assert.equal(isBoosterProduct(code), false, code)
})
test('direct starter-deck opening is rejected before any database access', async () => {
  const db = new Proxy({}, { get() { throw new Error('Database must not be accessed') } }) as Prisma.TransactionClient
  await assert.rejects(getBoosterDrawContext(db, 'ST-36'), (e: unknown) => (e as { code: string }).code === 'NOT_A_BOOSTER')
})
