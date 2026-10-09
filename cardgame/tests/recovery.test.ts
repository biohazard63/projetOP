import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deckInput, validateDeck } from '../src/lib/deckValidation'
import { isStrongPassword, rateLimit, registerFailure, isLocked, clearFailures } from '../src/lib/security'
import { verifyCaptcha } from '../src/lib/captcha'

const stored = [{ id: 'leader', type: 'LEADER', color: 'Rouge/Bleu', code: 'TEST-L' }, ...Array.from({ length: 13 }, (_, i) => ({ id: `c${i}`, type: 'CHARACTER', color: 'RED', code: `TEST-${i}` }))]
const cards = [{ id: 'leader', quantity: 1 }, ...stored.slice(1).map((c, i) => ({ id: c.id, quantity: i === 12 ? 2 : 4 }))]
test('legal 50-card deck with bilingual colors', () => assert.equal(validateDeck(cards, stored), null))
test('reject invalid quantities and names', () => {
 for (const quantity of [-1, 0, 1.5, 5]) assert.equal(deckInput.safeParse({ name: 'Test', cards: [{ id: 'c', quantity }] }).success, false)
 assert.equal(deckInput.safeParse({ name: ' ', cards }).success, false)
})
test('reject forged leader, colors, unknown and duplicate IDs', () => {
 assert.ok(validateDeck(cards, stored.map(c => c.id === 'leader' ? { ...c, type: 'CHARACTER' } : c)))
 assert.ok(validateDeck(cards, stored.map(c => c.id === 'c0' ? { ...c, color: 'GREEN' } : c)))
 assert.ok(validateDeck(cards, stored.slice(0, -1)))
 assert.ok(validateDeck([...cards, cards[1]], stored))
})
test('alternate arts share the four-copy cap', () => assert.ok(validateDeck(cards, stored.map(c => c.id === 'c1' ? { ...c, code: 'TEST-0_p1' } : c))))
test('bcrypt password limit uses bytes', () => assert.equal(isStrongPassword('Ab1!' + 'é'.repeat(35)), false))
test('rate limit and login lock', () => {
 const key = 'recovery-rate'
 assert.equal(rateLimit(key, 1, 60000).allowed, true)
 assert.equal(rateLimit(key, 1, 60000).allowed, false)
 for (let i = 0; i < 5; i++) registerFailure('recovery-lock', 5, 60000)
 assert.equal(isLocked('recovery-lock'), true)
 clearFailures('recovery-lock'); assert.equal(isLocked('recovery-lock'), false)
})
test('configured captcha rejects missing token and secret', async () => {
 const previous = process.env.CAPTCHA_PROVIDER
 process.env.CAPTCHA_PROVIDER = 'turnstile'
 assert.equal(await verifyCaptcha(undefined), false)
 process.env.CAPTCHA_PROVIDER = 'unknown-provider'
 assert.equal(await verifyCaptcha('test'), false)
 if (previous === undefined) delete process.env.CAPTCHA_PROVIDER; else process.env.CAPTCHA_PROVIDER = previous
})

import { ManualGameService } from '../src/lib/game/manualGameService'
import type { GameCard } from '../src/types/game'
const character: GameCard = { id: 'instance', name: 'Test', type: 'CHARACTER', color: 'RED', cost: 0, power: 2000, imageUrl: '/don.png' }
const leader: GameCard = { ...character, id: 'leader-instance', type: 'LEADER' }
test('playing characters preserves summoning sickness and enforces turn and field cap', () => {
 const state = ManualGameService.initializeGameWithDecks([character], [], leader, leader)
 state.currentPhase = 'MAIN'
 const played = ManualGameService.playCard(state, 'player', character.id)
 assert.equal(played.player.field[0].isActive, true)
 assert.equal(played.player.field[0].canAttack, false)
 assert.throws(() => ManualGameService.playCard({ ...state, currentPlayer: 'opponent' }, 'player', character.id))
 state.player.field = Array.from({ length: 5 }, (_, i) => ({ ...character, id: String(i) }))
 assert.throws(() => ManualGameService.playCard(state, 'player', character.id))
})
import { normalizeCardColors } from '../src/lib/cardColors'
test('collection colors normalize case, language and dual-color order', () => {
 assert.deepEqual(normalizeCardColors('Rouge/Bleu'), normalizeCardColors('blue/RED'))
 assert.deepEqual(normalizeCardColors('RED'), normalizeCardColors('Red'))
})
