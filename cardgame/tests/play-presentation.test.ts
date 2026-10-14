import test, { before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { animationSteps, lastSequence } from '../src/components/play/anim'
import { MemoryGameRepository } from '../src/lib/engine/repository'
import { PlayService } from '../src/lib/engine/service'
import { REFERENCE_DECKS } from '../src/lib/engine/decks'
import { emptyPresentationQueue, presentationReducer } from '../src/components/play/presentationQueue'
import { presentationDuration } from '../src/components/play/presentationTiming'
import type { AnimStep } from '../src/components/play/anim'
import type { View } from '../src/components/play/api'

let view: View
before(async () => { view = await new PlayService(new MemoryGameRepository(), () => 777).start('presentation', { ref: REFERENCE_DECKS[1].id, entries: structuredClone(REFERENCE_DECKS[1].entries) }, 'hard') as View })

test('confirmed Counter presentation is readable for at least 2.5 seconds after readability feedback', () => {
  const next = structuredClone(view)
  next.projection.events = [{ sequence: 9000, type: 'COUNTER_PLAYED', actorId: view.seat }]
  const steps = animationSteps(view, next, 8999)
  assert.ok(steps[0].duration === 2500)
})

test('presentation does not postpone automatic phases behind decorative steps', () => {
  const source = readFileSync('src/components/play/PlayApp.tsx', 'utf8')
  assert.ok(!source.includes("busy || step || queue.length || prompt(screen.view).kind !== 'advance'"))
})

const item = (key: string): AnimStep => ({ key, kind: 'draw', mine: true, text: 'Pioche', cards: [null], ids: [], duration: 450 })
test('queue retains every confirmed event, deduplicates refreshes and advances in order', () => {
  const steps = Array.from({ length: 40 }, (_, i) => item(`e${i}`))
  let queue = presentationReducer(emptyPresentationQueue(), { type: 'ENQUEUE', gameId: 'a', steps })
  queue = presentationReducer(queue, { type: 'ENQUEUE', gameId: 'a', steps })
  assert.equal(queue.pending.length, 39)
  for (const step of steps) {
    assert.equal(queue.active?.key, step.key)
    queue = presentationReducer(queue, { type: 'NEXT', gameId: 'a', key: step.key })
  }
  assert.equal(queue.active, null)
})
test('old timers cannot finish a new game or a newer animation', () => {
  let queue = presentationReducer(emptyPresentationQueue(), { type: 'ENQUEUE', gameId: 'a', steps: [item('e1')] })
  queue = presentationReducer(queue, { type: 'ENQUEUE', gameId: 'b', steps: [item('e1'), item('e2')] })
  assert.deepEqual(presentationReducer(queue, { type: 'NEXT', gameId: 'a', key: 'e1' }), queue)
  queue = presentationReducer(queue, { type: 'NEXT', gameId: 'b', key: 'e1' })
  assert.deepEqual(presentationReducer(queue, { type: 'NEXT', gameId: 'b', key: 'e1' }), queue)
})
test('skipping a sequence cannot replay the same events; reset clears only presentation', () => {
  let queue = presentationReducer(emptyPresentationQueue(), { type: 'ENQUEUE', gameId: 'a', steps: [item('e1')] })
  queue = presentationReducer(queue, { type: 'CLEAR' })
  assert.equal(presentationReducer(queue, { type: 'ENQUEUE', gameId: 'a', steps: [item('e1')] }).active, null)
  assert.deepEqual(presentationReducer(queue, { type: 'RESET' }), emptyPresentationQueue())
})
test('fast timing shortens decoration without modifying queued event content', () => {
  assert.equal(presentationDuration(1500, false), 1500)
  assert.equal(presentationDuration(1500, true), 600)
})
test('draws never disclose private faces and confirmed events preserve their sequence', () => {
  const next = structuredClone(view)
  next.projection.events = [{ sequence: 9002, type: 'DRAWN', actorId: view.seat }, { sequence: 9001, type: 'DRAWN', actorId: view.opponentSeat }]
  const steps = animationSteps(view, next, 9000)
  assert.deepEqual(steps.map(s => s.key), ['e9001', 'e9002'])
  assert.ok(steps.every(s => s.cards[0] === null && s.faces?.[0] === null && s.ids.length === 0))
})

test('a real Counter, resolve and combat announcement preserve server consequences', async () => {
  const { counterFixture } = await import('./play-presentation-fixture')
  const { combatPresentation } = await import('../src/components/play/combatPresentation')
  const f = await counterFixture('CHARACTER')
  let next = (await f.play.command(f.uid, f.view.gameId, { id:'counter',expectedVersion:f.view.version,intent:f.intent })).view
  const counter = animationSteps(f.view, next, lastSequence(f.view)).find(s => s.kind === 'counter')!
  assert.equal(counter.counter?.category, 'CHARACTER')
  assert.equal(counter.counter?.value, f.card.counter)
  assert.equal(counter.faces?.[0]?.number, f.card.number)
  const before = next
  const pass = next.legalActions.find(a => a.type === 'PASS_COUNTER')!
  next = (await f.play.command(f.uid, next.gameId, { id:'pass',expectedVersion:next.version,intent:{type:'PASS_COUNTER',battleId:pass.battleId} })).view
  const finished = next.projection.events.find(e => e.sequence > lastSequence(before) && e.type === 'BATTLE_RESOLVED')!
  assert.ok(finished)
  const result = combatPresentation(before, next, finished.sequence)
  assert.notEqual(result.outcome, 'UNKNOWN')
  assert.equal(animationSteps(before, next, lastSequence(before)).find(s => s.kind === 'combat')?.duration, 2500)
  const refresh = animationSteps(next, next, lastSequence(next))
  assert.deepEqual(refresh.filter(s => s.kind === 'combat' || s.kind === 'counter'), [])
})

test('Starter selection hides laboratory and personal decks without modifying their data', async () => {
  const React = await import('react')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { DeckPicker } = await import('../src/components/play/DeckPicker')
  const decks = { reference: [
    {id:'starter-st01',name:'Starter ST-01',leader:'ST01-001',ok:true,errors:[]},
    {id:'starter-st22',name:'Starter indisponible',ok:false,errors:['UNSUPPORTED_EFFECT']},
    {id:'reference-red',name:'Laboratoire masqué',ok:true,errors:[]},
  ],user:[{id:'personal',name:'Personnel masqué',ok:true,errors:[]}] }
  const before = JSON.stringify(decks)
  const html = renderToStaticMarkup(React.createElement(DeckPicker,{decks,busy:false,level:'normal',onLevel:()=>{},stats:null,tutorialSeen:true,onStart:()=>{},leaderImages:{'ST01-001':'/images/card-back.jpg'}}))
  assert.ok(html.includes('Starter ST-01') && html.includes('Starter indisponible'))
  assert.ok(!html.includes('Laboratoire masqué') && !html.includes('Personnel masqué'))
  assert.ok(html.includes('Leader du deck Starter ST-01'))
  assert.equal(JSON.stringify(decks),before)
})
