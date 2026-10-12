import test from 'node:test'
import assert from 'node:assert/strict'
import { runFullGame, fullGameInput, RED_M3_DECK, FULL_GAME_SEED } from '../scripts/game/m3-full-game'
import { PURPLE_DECK } from '../src/game/cards/m3PurpleDeck'
import { M3_RULESET } from '../src/game/rulesets/m3'
import { validateEngineDeck } from '../src/game/rulesets/decks'
import { createGame, applyCommand, getLegalActions, restoreGame } from '../src/game/core/game'
import { assertGameInvariants } from '../src/game/core/invariants'

// M3-5: complete game, purple ST04-001 Kaido vs red ST01-001 Luffy, both legal, driven only by public
// commands (no zone edit), restored from JSON every 25 commands, privacy checked after every command.
const run = runFullGame()

test('M3-5: both decks are legal in playable mode for the M3 ruleset', () => {
  const input = fullGameInput()
  for (const deck of [PURPLE_DECK, RED_M3_DECK]) assert.deepEqual(validateEngineDeck(deck, input.definitions, input.printings, M3_RULESET, 'playable'), [])
})

test('M3-5: the reference game reaches a regulatory victory through real commands', () => {
  assert.equal(FULL_GAME_SEED, 52)
  assert.deepEqual(run.final.result, { reason: 'LEADER_DAMAGED_AT_ZERO_LIFE', loserIds: ['bob'], winnerId: 'alice' })
  assert.equal(run.final.players[1].zones.life.length, 0)
  assert.ok(run.final.events.at(-1)!.type === 'GAME_ENDED')
  for (const p of ['alice', 'bob']) assert.equal(getLegalActions(run.final, p).length, 0, 'nothing can be played after the end')
  assert.ok(run.checkpoints >= 5, 'JSON checkpoints were taken during the game')
  assertGameInvariants(run.final); assert.deepEqual(restoreGame(JSON.stringify(run.final)), run.final)
})

test('M3-5: the game covers setup, turns, abilities, battles, counters, triggers, Life and victory', () => {
  const required = ['CHOOSE_FIRST', 'MULLIGAN', 'ADVANCE_PHASE', 'END_MAIN', 'PLAY_CARD', 'ATTACH_DON', 'DECLARE_ATTACK', 'ACTIVATE_BLOCKER', 'PASS_BLOCKER', 'PLAY_COUNTER_CHARACTER', 'PASS_COUNTER', 'RESOLVE_BATTLE', 'ANSWER_TRIGGER', 'ANSWER_CHOICE',
    'COUNTER_EVENT:ST04-016', 'COUNTER_EVENT:ST01-014', 'COUNTER_EVENT:OP06-017', 'START_EFFECT:ST04-001.activate-main-trash-top-life', 'START_EFFECT:ST01-001.activate-main-give-rested-don', 'START_EFFECT:OP06-018.main-power-condition',
    'PLAY:OP01-016', 'PLAY:OP06-013', 'PLAY:OP06-009', 'PLAY:ST04-011',
    'EVENT:HAND_REDRAWN', 'EVENT:DRAWN', 'EVENT:DON_ADDED', 'EVENT:LIFE_DAMAGED', 'EVENT:LIFE_PAID', 'EVENT:LIFE_TRASHED', 'EVENT:CHARACTER_KO', 'EVENT:TRIGGER_ACTIVATED', 'EVENT:CARD_REVEALED', 'EVENT:GAME_ENDED']
  assert.deepEqual(required.filter(key => !run.coverage[key]), [])
})

test('M3-5: no projection ever exposed a hidden hand, deck or Life card', () => {
  assert.deepEqual(run.leaks, [])
})

test('M3-5: the command log alone reproduces the game, and every command is idempotent on replay', () => {
  let s = createGame(fullGameInput())
  for (const command of run.commands) {
    const r = applyCommand(s, command); assert.ok(r.ok, r.ok ? '' : `${command.expectedVersion}:${r.error}`); if (!r.ok) return
    const replay = applyCommand(r.state, command); assert.ok(replay.ok && replay.replayed, `${command.expectedVersion} replay`)
    s = r.state
  }
  assert.deepEqual(s, run.final)
  const second = runFullGame()
  assert.deepEqual(second.commands, run.commands); assert.deepEqual(second.final, run.final)
})

test('M3-5: other seeds also end in a victory without leaks or refused commands', () => {
  for (const seed of [1, 7, 13, 21, 34, 48]) {
    const other = runFullGame(seed)
    assert.ok(other.final.result?.winnerId, `seed ${seed}`); assert.deepEqual(other.leaks, [], `seed ${seed}`)
  }
})
