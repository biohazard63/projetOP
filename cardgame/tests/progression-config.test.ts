import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BADGE_STEPS, PROGRESSION, badgeLevel, levelOf, levelReward, rankOf, titleOf, xpForLevel } from '../src/lib/progression/config'

test('13 badge levels from Bronze I to Légende, with increasing thresholds', () => {
  assert.equal(BADGE_STEPS, 13)
  assert.deepEqual([1, 3, 4, 7, 10, 12, 13].map(l => rankOf(l).label), ['Bronze I', 'Bronze III', 'Argent I', 'Or I', 'Platine I', 'Platine III', 'Légende'])
  const pilleur = PROGRESSION.badges.find(b => b.id === 'pilleur')!
  assert.deepEqual([0, 4, 5, 49, 50, 2000, 9999].map(v => badgeLevel(pilleur, v)), [0, 0, 1, 3, 4, 13, 13])
})

test('A badge pays about a display by Platine I and a display at Légende', () => {
  const total = (to: number) => Array.from({ length: to }, (_, i) => rankOf(i + 1).reward).reduce((a, b) => a + b, 0)
  assert.equal(rankOf(13).reward, 20000)
  assert.ok(total(10) >= 15000, `Platine I total ${total(10)}`)
})

test('Account levels: growing XP curve, rewards every level, more every 5 and 10, titles by tens', () => {
  assert.equal(xpForLevel(1), 0); assert.equal(xpForLevel(2), 100)
  for (let l = 2; l <= 100; l++) assert.ok(xpForLevel(l + 1) - xpForLevel(l) >= xpForLevel(l) - xpForLevel(l - 1))
  assert.equal(levelOf(0).level, 1); assert.equal(levelOf(99).level, 1); assert.equal(levelOf(100).level, 2)
  assert.equal(levelOf(10_000_000).level, 100)
  assert.deepEqual([3, 5, 10, 20].map(levelReward), [300, 2000, 20000, 20000])
  assert.deepEqual([1, 9, 10, 55, 100].map(titleOf), ['Mousse', 'Mousse', 'Matelot', 'Corsaire', 'Roi des pirates'])
})
