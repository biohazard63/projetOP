import assert from 'node:assert/strict'
import test from 'node:test'
import { characterPositions } from '../src/components/play/boardLayout'

test('character area always exposes five positions without inventing cards', () => {
  const cards = ['one', 'two', 'three', 'four', 'five']

  assert.deepEqual(characterPositions(cards), cards.map(card => ({ kind: 'card', card })))
  assert.deepEqual(characterPositions(cards.slice(0, 2)), [
    { kind: 'card', card: 'one' },
    { kind: 'card', card: 'two' },
    { kind: 'empty', index: 2 },
    { kind: 'empty', index: 3 },
    { kind: 'empty', index: 4 },
  ])
  assert.deepEqual(characterPositions<string>([]), Array.from({ length: 5 }, (_, index) => ({ kind: 'empty' as const, index })))
})

test('character area does not truncate cards when given a larger capacity', () => {
  assert.deepEqual(characterPositions(['one', 'two', 'three'], 2), [
    { kind: 'card', card: 'one' },
    { kind: 'card', card: 'two' },
    { kind: 'card', card: 'three' },
  ])
})
