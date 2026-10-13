import assert from 'node:assert/strict'
import test from 'node:test'
import { handFanLayout } from '../src/components/play/handLayout'

test('hand fan is centered for one, five, ten and fifteen cards', () => {
  for (const count of [1, 5, 10, 15]) {
    const layout = handFanLayout(count)
    assert.equal(layout.length, count)
    assert.ok(layout.every((card, index) => Math.abs(card.angle + layout[count - 1 - index]!.angle) < 0.001))
    assert.ok(layout.every(card => Math.abs(card.angle) <= 20))
  }
})

test('hand fan adds controlled overlap as the hand grows without changing the board height', () => {
  const small = handFanLayout(5), large = handFanLayout(15)
  assert.ok(small.every(card => card.overlap === 0))
  assert.ok(large.every((card, index) => index === 0 || card.overlap < 0))
  assert.equal(large[7].offsetY, 0)
  assert.equal(large[0].offsetY, large.at(-1)?.offsetY)
})

test('hand fan rejects impossible card counts', () => {
  assert.deepEqual(handFanLayout(0), [])
  assert.deepEqual(handFanLayout(-1), [])
})

test('outer cards rise into the fan instead of extending below the reserved hand baseline', () => {
  for (const count of [1, 5, 10, 15]) {
    const layout = handFanLayout(count)
    assert.ok(layout.every(card => card.offsetY <= 0))
    assert.equal(layout[Math.floor((count - 1) / 2)]?.offsetY ?? 0, count % 2 === 1 ? 0 : layout[Math.ceil((count - 1) / 2)]?.offsetY)
  }
})
