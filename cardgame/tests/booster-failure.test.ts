import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Prisma } from '@prisma/client'
import { describeBoosterFailure } from '../src/lib/boosters/failure'
import { BoosterError } from '../src/lib/boosters/rules'

const known = (code: string) => new Prisma.PrismaClientKnownRequestError('postgresql://private-user:private-password@private-host/db', {
  code, clientVersion: 'test', meta: { connection: 'private-password', query: 'private SQL' },
})
test('missing production tables and columns give an actionable schema error', () => {
  for (const code of ['P2021', 'P2022']) {
    const result = describeBoosterFailure(known(code))
    assert.equal(result.status, 503); assert.equal(result.code, 'DATABASE_SCHEMA_OUTDATED')
    assert.equal(result.databaseCode, code); assert.match(result.message, /même clé/)
  }
})
test('connection and transaction failures keep the original opening recoverable', () => {
  for (const code of ['P1000', 'P1001', 'P1002', 'P1008', 'P1010', 'P1017', 'P2024']) {
    assert.equal(describeBoosterFailure(known(code)).code, 'DATABASE_UNAVAILABLE')
  }
  const result = describeBoosterFailure(known('P2028'))
  assert.equal(result.status, 503); assert.equal(result.code, 'OPENING_TRANSACTION_FAILED')
  assert.match(result.message, /même clé/)
  const initialization = new Prisma.PrismaClientInitializationError('private connection details', 'test', 'P1001')
  assert.equal(describeBoosterFailure(initialization).databaseCode, 'P1001')
})
test('operational failures never expose secrets, SQL, stack traces or untrusted codes', () => {
  for (const error of [known('P2022'), known('P2010'), known('private-password'), new Error('private-password'), { code: 'P2022', message: 'private-password' }]) {
    const output = JSON.stringify(describeBoosterFailure(error))
    for (const secret of ['private-', 'postgresql:', 'private SQL', 'stack', 'connection']) assert.ok(!output.includes(secret))
  }
  assert.equal(describeBoosterFailure({ code: 'P2022' }).code, 'SERVER_ERROR')
  assert.equal(describeBoosterFailure(known('private-password')).databaseCode, null)
})
test('known business errors retain their existing code, message and status', () => {
  const result = describeBoosterFailure(new BoosterError('IDEMPOTENCY_CONFLICT', 'Cette clé appartient à une autre extension', 409))
  assert.equal(result.status, 409); assert.equal(result.code, 'IDEMPOTENCY_CONFLICT')
  assert.equal(result.databaseCode, null)
})
