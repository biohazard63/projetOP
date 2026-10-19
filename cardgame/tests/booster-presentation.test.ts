import { test } from 'node:test'
import assert from 'node:assert/strict'
import { advanceReveal, openingEffect, animationDuration } from '../src/lib/boosters/presentation'
test('A card requires reveal then advance; final card leads to summary without overflowing', () => {
 let state = { index: 0, faceUp: false, complete: false }
 state = advanceReveal(state, 2); assert.deepEqual(state, { index: 0, faceUp: true, complete: false })
 state = advanceReveal(state, 2); assert.deepEqual(state, { index: 1, faceUp: false, complete: false })
 state = advanceReveal(state, 2); assert.equal(state.faceUp, true)
 state = advanceReveal(state, 2); assert.equal(state.complete, true)
 assert.deepEqual(advanceReveal(state, 2), state)
})
test('No cards and single-card packs have finite reveal states', () => {
 assert.equal(advanceReveal({ index: 0, faceUp: false, complete: false }, 0).complete, true)
 assert.equal(advanceReveal({ index: 0, faceUp: true, complete: false }, 1).complete, true)
})
test('Variants remain distinct from rarity and managed metadata overrides legacy flags', () => {
 const base = { rarity: 'C', isAltArt: false, isParallel: false, isSpecial: false }
 assert.equal(openingEffect({ ...base, isAltArt: true }), 'holographic')
 assert.equal(openingEffect({ ...base, rarity: 'UC' }), 'uncommon')
 assert.equal(openingEffect({ ...base, rarity: 'SEC' }), 'secret')
 assert.equal(openingEffect({ ...base, rarity: 'R SP' }), 'secret')
 assert.equal(openingEffect({ ...base, isAltArt: true, drawVariant: 'standard' }), 'common')
})
test('Speed and fast mode only configure presentation duration', () => {
 assert.equal(animationDuration('normal', false), 3400)
 assert.ok(animationDuration('slow', false) > animationDuration('fast', false))
 assert.equal(animationDuration('slow', true), animationDuration('fast', true))
})
test('Collector tiers have their own reveal: alternates shine, SP flash, manga panels, legendary light', () => {
 const base = { rarity: 'SR', isAltArt: false, isParallel: false, isSpecial: false }
 const effect = (drawTier: string) => openingEffect({ ...base, drawTier })
 assert.deepEqual(['ALT', 'LEADER ALT'].map(effect), ['holographic', 'holographic'])
 assert.deepEqual(['SP CARD', 'WANTED', 'TR'].map(effect), ['secret', 'secret', 'secret'])
 assert.deepEqual(['MANGA', 'CREW ALT', 'SUPER LEADER'].map(effect), ['manga', 'manga', 'manga'])
 assert.deepEqual(['SP SILVER', 'SP GOLD', 'MANGA GOLD', 'MANGA RED'].map(effect), ['legendary', 'legendary', 'legendary', 'legendary'])
})
