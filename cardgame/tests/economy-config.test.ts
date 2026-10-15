import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ECONOMY, economyAt, parisDay, parisDayStart } from '../src/lib/economy/config'

test('economy.json is valid and events apply only between their dates, cumulated', () => {
  const example = ECONOMY.events.find(e => e.id === 'exemple-week-end-double')!
  const during = new Date(new Date(example.start).getTime() + 3600_000), outside = new Date(new Date(example.end).getTime() + 1)
  assert.equal(economyAt(during).rewards.dailyTreasure, Math.round(ECONOMY.rewards.dailyTreasure * (example.rewardMultiplier ?? 1)))
  assert.equal(economyAt(during).prices.booster, Math.round(ECONOMY.prices.booster * (example.priceMultiplier ?? 1)))
  assert.deepEqual(economyAt(during).events.map(e => e.id), [example.id])
  assert.equal(economyAt(outside).prices.booster, ECONOMY.prices.booster)
  assert.deepEqual(economyAt(outside).events, [])
})

test('the Paris day starts at local midnight in winter and in summer', () => {
  assert.equal(parisDayStart(new Date('2026-01-15T12:00:00Z')).toISOString(), '2026-01-14T23:00:00.000Z')
  assert.equal(parisDayStart(new Date('2026-07-15T12:00:00Z')).toISOString(), '2026-07-14T22:00:00.000Z')
  assert.equal(parisDay(new Date('2026-07-14T22:30:00Z')), '2026-07-15')
})
