import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryGameRepository } from '../src/lib/engine/repository'
import { PlayService, HUMAN_SEAT, BOT_SEAT } from '../src/lib/engine/service'
import { REFERENCE_DECKS } from '../src/lib/engine/decks'
import { animationSteps, journal, lastSequence } from '../src/components/play/anim'
import { dropIntent, draggable, FIELD_DROP, prompt, seats, cardActions, type Visible } from '../src/components/play/model'
import { TUTORIAL_STEPS } from '../src/components/play/Tutorial'
import type { View } from '../src/components/play/api'

// M5-2/M5-3 board logic on real server views. Rendering, gestures and timing are covered by the browser test.
let n = 0
async function game(level: 'easy' | 'normal' | 'hard' = 'normal') {
  const repo = new MemoryGameRepository(), play = new PlayService(repo, () => 777), uid = `m5ui-${++n}`
  let view = await play.start(uid, { ref: 'reference-red', entries: structuredClone(REFERENCE_DECKS[1].entries) }, level) as unknown as View
  const cmd = async (intent: Record<string, unknown>) => { view = (await play.command(uid, view.gameId, { id: `u-${view.version}`, expectedVersion: view.version, intent })).view as unknown as View; return view }
  return { repo, play, uid, get view() { return view }, cmd }
}
async function toMyMain(g: Awaited<ReturnType<typeof game>>) {
  if (prompt(g.view).kind === 'first') await g.cmd({ type: 'CHOOSE_FIRST', choice: 'FIRST' })
  if (prompt(g.view).kind === 'mulligan') await g.cmd({ type: 'MULLIGAN', redraw: false })
  while (prompt(g.view).kind === 'advance') await g.cmd({ type: 'ADVANCE_PHASE' })
}
function hidden(g: Awaited<ReturnType<typeof game>>) {
  const s = g.repo.games.get(g.view.gameId)!.state, bot = s.players.find(p => p.id === BOT_SEAT)!, me = s.players.find(p => p.id === HUMAN_SEAT)!
  return new Set([...bot.zones.hand, ...bot.zones.deck, ...bot.zones.life, ...me.zones.life, ...me.zones.deck])
}

test('M5-2: animations come only from events after the last shown one, in order, with hidden cards face down', async () => {
  const g = await game('hard'); await toMyMain(g)
  let before = g.view
  for (let turn = 0; turn < 6 && g.view.status === 'ACTIVE'; turn++) {
    while (prompt(g.view).kind !== 'main' && g.view.status === 'ACTIVE') {
      const p = prompt(g.view)
      if (p.kind === 'advance') await g.cmd({ type: 'ADVANCE_PHASE' })
      else if (p.kind === 'block') await g.cmd({ type: 'PASS_BLOCKER', battleId: p.battleId })
      else if (p.kind === 'counter') await g.cmd({ type: 'PASS_COUNTER', battleId: p.battleId })
      else if (p.kind === 'trigger') await g.cmd({ type: 'ANSWER_TRIGGER', choiceId: p.choiceId, activate: false })
      else if (p.kind === 'choice') await g.cmd({ type: 'ANSWER_CHOICE', choiceId: p.action.choiceId, tokens: p.action.options.slice(0, p.action.choiceType === 'ORDER' ? p.action.max : p.action.min).map(o => o.token) })
      else break
    }
    if (g.view.status !== 'ACTIVE') break
    const after = lastSequence(before), next = await g.cmd({ type: 'END_MAIN' })
    const steps = animationSteps(before, next, after)
    const keys = steps.filter(s => s.key.startsWith('e')).map(s => Number(s.key.slice(1)))
    assert.deepEqual(keys, [...keys].sort((a, b) => a - b), 'bot steps keep the event order')
    assert.ok(keys.every(k => k > after), 'nothing already shown is replayed')
    assert.deepEqual(animationSteps(next, next, lastSequence(next)).filter(s => s.key.startsWith('e')), [], 'a refreshed view with the same last event animates nothing')
    const secret = hidden(g)
    for (const s of steps) {
      assert.ok(s.ids.every(id => !secret.has(id)), `${s.kind} names no hidden card`)
      if (s.kind === 'draw' || s.kind === 'life') assert.deepEqual(s.cards, [null], 'draws and Life are shown face down')
      // Motion stays short; card text is timed for reading (V2) and the turn banner may carry the opponent's turn summary.
      assert.ok(s.duration > 0 && s.duration <= (s.reading ? 12000 : s.summary ? 3000 : 2500), 'central readable durations')
    }
    before = next
  }
  const log = journal(g.view)
  assert.ok(log.length > 10 && log.every(e => typeof e.text === 'string' && e.text.length > 0))
  assert.ok(log.some(e => /adversaire/i.test(e.text)), 'the bot actions are readable in the journal')
})

test('M5-3: a drop becomes an intent only when a legal action allows it', async () => {
  const g = await game(); await toMyMain(g)
  const opening = journal(g.view).map(e => e.text)
  for (const line of ['Vous choisissez l’ordre de jeu', 'Vous gardez votre main', 'L’adversaire garde sa main', 'Vous recevez des DON!!']) assert.ok(opening.includes(line), `journal shows: ${line}`)
  const { me, foe } = seats(g.view), hand = (me.hand ?? []) as Visible[]
  for (const c of hand) {
    const legal = g.view.legalActions.some(a => a.type === 'PLAY_CARD' && a.instanceId === c.id)
    const intent = dropIntent(g.view, { kind: 'hand', id: c.id }, FIELD_DROP)
    assert.equal(!!intent, legal, `${c.id} drop matches its legality`); assert.equal(draggable(g.view, 'hand', c.id), legal || cardActions(g.view, c.id).some(a => a.key === 'counter'))
    assert.equal(dropIntent(g.view, { kind: 'hand', id: c.id }, (foe.leader as Visible[])[0].id), null, 'a card dropped on the opponent does nothing')
  }
  const don = (me.cost as Visible[]).find(d => !d.rested)!, leader = (me.leader as Visible[])[0]
  assert.deepEqual(dropIntent(g.view, { kind: 'don', id: don.id }, leader.id), { type: 'ATTACH_DON', donIds: [don.id], targetId: leader.id })
  assert.equal(dropIntent(g.view, { kind: 'don', id: don.id }, (foe.leader as Visible[])[0].id), null)
  assert.equal(dropIntent(g.view, { kind: 'attacker', id: leader.id }, (foe.leader as Visible[])[0].id), null, 'CR 6-5-6-1: no attack on the first turn')
})

test('M5-5: the tutorial covers Leader/Life, DON!!, playing, attacking, Counter, Blocker, end of turn and victory', () => {
  assert.deepEqual(TUTORIAL_STEPS.map(s => s.id), ['leader', 'don', 'play', 'attack', 'counter', 'blocker', 'end', 'win'])
  assert.deepEqual(TUTORIAL_STEPS.filter(s => s.doneOn).map(s => s.doneOn), ['CARD_PLAYED', 'ATTACK_DECLARED', 'TURN_ENDED'], 'action steps advance on the matching confirmed event')
})

test('M5-5: statistics count games, wins, losses and concessions by deck and level for the user only', async () => {
  const repo = new MemoryGameRepository(), play = new PlayService(repo, () => 99)
  const a = await play.start('alice-stats', { ref: 'reference-red', entries: structuredClone(REFERENCE_DECKS[1].entries) }, 'easy')
  await play.concede('alice-stats', a.gameId, 'c1')
  const b = await play.start('alice-stats', { ref: 'reference-purple', entries: structuredClone(REFERENCE_DECKS[0].entries) }, 'hard')
  await play.concede('alice-stats', b.gameId, 'c2')
  await play.start('bob-stats', { ref: 'reference-red', entries: structuredClone(REFERENCE_DECKS[1].entries) }, 'normal')
  const stats = await play.stats('alice-stats')
  assert.deepEqual({ played: stats.played, wins: stats.wins, losses: stats.losses, concessions: stats.concessions }, { played: 2, wins: 0, losses: 2, concessions: 2 })
  assert.deepEqual(Object.keys(stats.byLevel).sort(), ['easy', 'hard']); assert.deepEqual(Object.keys(stats.byDeck).sort(), ['reference-purple', 'reference-red'])
  assert.equal((await play.stats('bob-stats')).played, 0, 'unfinished games are not counted and users are isolated')
})

test('M5-2: every animation kind is produced from real server views (draw … result), hidden cards staying face down', async () => {
  const { botDecision } = await import('../src/lib/engine/strategy')
  const kinds = new Set<string>()
  for (const seed of [11, 23, 35, 47, 59, 71]) {
    const repo = new MemoryGameRepository(), play = new PlayService(repo, () => seed), uid = `m5kinds-${seed}`
    let view = await play.start(uid, { ref: 'reference-red', entries: structuredClone(REFERENCE_DECKS[1].entries) }, 'hard') as unknown as View
    for (let n = 0; n < 400 && view.status === 'ACTIVE'; n++) {
      const state = repo.games.get(view.gameId)!.state
      const { intent } = botDecision(state, HUMAN_SEAT, 'hard')
      const next = (await play.command(uid, view.gameId, { id: `k-${view.version}`, expectedVersion: view.version, intent: intent as never })).view as unknown as View
      for (const s of animationSteps(view, next, lastSequence(view))) { kinds.add(s.kind); if (s.kind === 'draw' || s.kind === 'life') assert.deepEqual(s.cards, [null]) }
      view = next
    }
  }
  assert.deepEqual([...kinds].sort(), ['ability', 'attack', 'block', 'combat', 'counter', 'don-add', 'don-attach', 'don-rest', 'draw', 'ko', 'life', 'play', 'power', 'result', 'trash', 'trigger', 'turn'])
})
