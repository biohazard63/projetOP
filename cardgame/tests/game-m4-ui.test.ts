import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryGameRepository } from '../src/lib/engine/repository'
import { PlayService } from '../src/lib/engine/service'
import { cardActions, prompt, seats, parseEffectId, feed, type Intent, type Visible } from '../src/components/play/model'
import { eventLabel, errorLabel, deckErrorLabel } from '../src/components/play/labels'
import type { View } from '../src/components/play/api'

// M4-I5: the board logic. A player who only uses what the /play screen offers (prompt + card actions) can
// always act when it must, and plays a whole game to its end. Rendering and touch are covered by the browser test.
let n = 0
async function newGame(deck = 'reference-purple') {
  const repo = new MemoryGameRepository(), play = new PlayService(repo, () => 4242), uid = `ui-${++n}`
  const view = await play.start(uid, { ref: deck, entries: (await import('../src/lib/engine/decks')).REFERENCE_DECKS.find(d => d.id === deck)!.entries })
  return { play, uid, view: view as unknown as View }
}
function screenIntent(view: View): Intent {
  const p = prompt(view), { me, foe } = seats(view), hand = (me.hand ?? []) as Visible[]
  switch (p.kind) {
    case 'first': return { type: 'CHOOSE_FIRST', choice: 'FIRST' }
    case 'mulligan': return { type: 'MULLIGAN', redraw: false }
    case 'choice': return { type: 'ANSWER_CHOICE', choiceId: p.action.choiceId, tokens: p.action.options.slice(0, p.action.choiceType === 'ORDER' ? p.action.max : Math.max(p.action.min, Math.min(1, p.action.max))).map(o => o.token) }
    case 'trigger': return { type: 'ANSWER_TRIGGER', choiceId: p.choiceId, activate: true }
    case 'block': return { type: 'PASS_BLOCKER', battleId: p.battleId }
    case 'counter': {
      const counter = hand.flatMap(c => cardActions(view, c.id)).find(a => a.key === 'counter' && a.intent)
      return counter?.intent ?? { type: 'PASS_COUNTER', battleId: p.battleId }
    }
    case 'resolve': return { type: 'RESOLVE_BATTLE', battleId: p.battleId }
    case 'continue': return { type: 'CONTINUE_LIFE_DAMAGE', battleId: p.battleId }
    case 'advance': return { type: 'ADVANCE_PHASE' }
    case 'main': {
      const play = hand.flatMap(c => cardActions(view, c.id)).find(a => a.key === 'play' && a.intent)
      if (play?.intent) return play.intent
      for (const c of [...(me.characters as Visible[]), ...(me.leader as Visible[])]) {
        const attack = cardActions(view, c.id).find(a => a.key === 'attack')
        if (attack?.targets) return attack.targets.build(attack.targets.ids.includes((foe.leader as Visible[])[0].id) ? (foe.leader as Visible[])[0].id : attack.targets.ids[0])
      }
      return { type: 'END_MAIN' }
    }
    default: throw new Error(`NO_SCREEN_ACTION:${p.kind}`)
  }
}

test('M4-I5: every decision window the human meets has a screen action, and a whole game is played from the screen', async () => {
  const game = await newGame(), { play, uid } = game
  let view = game.view
  const kinds = new Set<string>()
  for (let step = 0; step < 3000 && view.status === 'ACTIVE'; step++) {
    const p = prompt(view); kinds.add(p.kind)
    assert.notEqual(p.kind, 'wait', 'the human never waits while it holds the decision')
    if (view.legalActions.length) assert.ok(['first', 'mulligan', 'choice', 'trigger', 'block', 'counter', 'resolve', 'continue', 'main', 'advance'].includes(p.kind))
    const { view: next } = await play.command(uid, view.gameId, { id: `s-${view.version}`, expectedVersion: view.version, intent: screenIntent(view) })
    view = next as unknown as View
  }
  assert.equal(view.status, 'FINISHED'); assert.equal(prompt(view).kind, 'over')
  for (const kind of ['first', 'mulligan', 'main', 'advance', 'block', 'counter', 'resolve']) assert.ok(kinds.has(kind), `window ${kind} met`)
})

test('M4-I5: card actions only come from legal actions and target lists come from the engine', async () => {
  const { play, uid, view: start } = await newGame('reference-red')
  let view = start
  for (const intent of [{ type: 'CHOOSE_FIRST', choice: 'FIRST' }, { type: 'MULLIGAN', redraw: false }]) view = (await play.command(uid, view.gameId, { id: `x-${view.version}`, expectedVersion: view.version, intent })).view as unknown as View
  while (prompt(view).kind === 'advance') view = (await play.command(uid, view.gameId, { id: `a-${view.version}`, expectedVersion: view.version, intent: { type: 'ADVANCE_PHASE' } })).view as unknown as View
  const { me } = seats(view)
  for (const c of [...((me.hand ?? []) as Visible[]), ...(me.leader as Visible[])]) for (const action of cardActions(view, c.id)) {
    const type = action.intent?.type ?? action.targets!.build(action.targets!.ids[0]).type
    assert.ok(view.legalActions.some(a => a.type === type), `${action.label} is backed by ${type}`)
  }
  const leaderActions = cardActions(view, (me.leader as Visible[])[0].id)
  assert.ok(leaderActions.some(a => a.key === 'attach'), 'DON!! can be given to the Leader on the first turn')
  assert.equal(leaderActions.some(a => a.key === 'attack'), false, 'CR 6-5-6-1: no attack on the first turn')
  assert.deepEqual(parseEffectId('ST01-001.activate-main-give-rested-don:play-x:p0:c0:3'), { abilityId: 'ST01-001.activate-main-give-rested-don', instanceId: 'play-x:p0:c0' })
})

test('M4-I5: labels are French, feedback lists only new events and unknown codes stay generic', async () => {
  const { view } = await newGame()
  assert.deepEqual(feed(view, Number.MAX_SAFE_INTEGER, eventLabel), [])
  assert.equal(eventLabel('ATTACK_DECLARED', false), 'L’adversaire attaque'); assert.equal(eventLabel('ATTACK_DECLARED', true), 'Vous attaquez')
  assert.equal(errorLabel('STALE_VERSION'), 'La partie a changé dans un autre onglet : affichage mis à jour.')
  assert.equal(errorLabel('SOMETHING_NEW'), 'Action refusée.')
  assert.equal(deckErrorLabel('NOT_IN_ENGINE_CATALOG:abc'), 'contient des cartes que le moteur ne sait pas encore jouer')
})
