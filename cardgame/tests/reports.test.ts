import test from 'node:test'
import assert from 'node:assert/strict'
import { reportFilters, reportRequest, isReportAdmin, createReport, type ReportStore } from '../src/lib/reports/service'
import { boosterReportCard, playReportCard, collectionReportCard } from '../src/components/reports/snapshots'
import type { OpeningCard } from '../src/lib/boosters/types'
import type { CardDisplay } from '../src/lib/engine/catalog'

const input = () => ({ requestId: 'test-request', source: 'BOOSTER', category: 'WRONG_VARIANT', description: 'Cette carte est une version normale.', card: { id: 'card-1', code: 'OP01-001_p1', name: 'Carte test', imageUrl: '/images/card.webp', rarity: 'SR', isAltArt: true, drawVariant: 'alt', effect: 'Texte affiché' }, context: { openingId: 'opening-1', pathname: '/booster-opening' } })
function fixture() {
  const saved: unknown[] = []
  const store: ReportStore = {
    ownsGame: async () => true, ownsOpening: async () => true,
    save: async data => { saved.push(data); return { id: 'report-1' } },
  }
  return { store, saved }
}
test('card snapshot retains exact printing, image, texts and variant metadata; unknown state is stripped', () => {
  const parsed = reportRequest.parse({ ...input(), card: { ...input().card, password: 'excluded' }, context: { ...input().context, state: { opponentHand: 'excluded' } } })
  assert.equal(parsed.card?.code, 'OP01-001_p1')
  assert.equal(parsed.card?.effect, 'Texte affiché')
  assert.equal(parsed.card?.isAltArt, true)
  assert.equal('password' in parsed.card!, false)
  assert.equal('state' in parsed.context, false)
})
test('invalid, missing, unbounded fields and incompatible contexts are rejected', () => {
  for (const bad of [{ ...input(), description: ' ' }, { ...input(), description: 'a'.repeat(4001) }, { ...input(), category: 'BAD' }, { ...input(), card: undefined }, { ...input(), context: { gameId: 'other' } }, { ...input(), card: { ...input().card, imageUrl: 'javascript:alert(1)' } }]) assert.equal(reportRequest.safeParse(bad).success, false)
  assert.equal(reportRequest.safeParse({ ...input(), category: 'BUG', card: undefined }).success, true)
})
test('report submission requires a signed-in user and owned context', async () => {
  const { store, saved } = fixture()
  await assert.rejects(createReport(null, input(), store), /AUTH_REQUIRED/)
  store.ownsOpening = async () => false
  await assert.rejects(createReport('user', input(), store), /CONTEXT_NOT_FOUND/)
  store.ownsGame = async () => false
  await assert.rejects(createReport('user', { ...input(), source: 'PLAY', context: { gameId: 'game-1', turn: 2 } }, store), /CONTEXT_NOT_FOUND/)
  assert.equal(saved.length, 0)
})
test('creation records reporter identity from session and forwards stable idempotency key', async () => {
  const { store, saved } = fixture()
  assert.deepEqual(await createReport('user', { ...input(), userId: 'forged' }, store), { id: 'report-1' })
  assert.equal((saved[0] as { userId: string }).userId, 'user')
  assert.equal((saved[0] as { requestId: string }).requestId, 'test-request')
})
test('admin allowlist is closed by default, trimmed and matched by complete email', () => {
  assert.equal(isReportAdmin('owner@example.test', ''), false)
  assert.equal(isReportAdmin(null, 'owner@example.test'), false)
  assert.equal(isReportAdmin('OWNER@example.test', ' owner@example.test, second@example.test '), true)
  assert.equal(isReportAdmin('other-owner@example.test', 'owner@example.test'), false)
})
test('snapshots preserve the translated text actually displayed and its source, alongside catalogue text', () => {
  const card = { ...input().card, imageUrl: '', effect: 'Original text', trigger: 'Original trigger' } as unknown as OpeningCard
  const snapshot = boosterReportCard(card, { effect: 'Texte français affiché', trigger: 'Trigger français', source: 'unofficial', original: false })
  assert.equal(snapshot.effect, 'Original text')
  assert.equal(snapshot.displayedEffect, 'Texte français affiché')
  assert.equal(snapshot.textSource, 'unofficial')
  assert.equal(snapshot.imageUrl, null)
})
test('play snapshot preserves effective power and inspected VO, without losing base values', () => {
  const card = { number: 'ST01-001', name: 'Test', definitionId: 'test@1', category: 'LEADER', colors: ['RED'], cost: null, power: 5000, counter: null, life: 5, text: 'Texte français', trigger: '', imageUrl: null, language: 'fr', original: { text: 'Original text', trigger: '' } } as CardDisplay
  const snapshot = playReportCard(card, 'printing@1', { power: 7000, rested: true }, true)
  assert.equal(snapshot.power, 5000)
  assert.equal(snapshot.currentPower, 7000)
  assert.equal(snapshot.rested, true)
  assert.equal(snapshot.displayedEffect, 'Original text')
  assert.equal(snapshot.effect, 'Texte français')
})

test('collection reports attach a card and collection origin without game or opening context', async () => {
  const { store, saved } = fixture()
  const body = { ...input(), source: 'COLLECTION', context: { pathname: '/collection' } }
  assert.equal(reportRequest.safeParse(body).success, true)
  assert.deepEqual(await createReport('collector', body, store), { id: 'report-1' })
  assert.equal((saved[0] as { source: string }).source, 'COLLECTION')
  for (const bad of [{ ...body, card: undefined }, { ...body, context: { pathname: '/play' } }, { ...body, context: { pathname: '/collection', gameId: 'game' } }, { ...body, context: { pathname: '/collection', openingId: 'opening' } }]) {
    assert.equal(reportRequest.safeParse(bad).success, false)
  }
})


test('collection snapshots preserve full texts and displayed translation with nullable catalogue flags', () => {
  const card = { ...input().card, isAltArt: null, isParallel: null, isSpecial: null, ability: 'Ability', trigger: 'Original trigger', family: 'Family', attribute: 'Slash', counter: '1000', quantity: 2 } as unknown as import('../src/lib/collector/types').CatalogueCard
  const snapshot = collectionReportCard(card, { effect: 'Texte affiché', trigger: 'Trigger affiché', source: 'official', original: false })
  assert.equal(snapshot.ability, 'Ability')
  assert.equal(snapshot.trigger, 'Original trigger')
  assert.equal(snapshot.displayedEffect, 'Texte affiché')
  assert.equal(snapshot.displayedTrigger, 'Trigger affiché')
  assert.equal(snapshot.family, 'Family')
  assert.equal(snapshot.isAltArt, undefined)
  assert.equal('quantity' in snapshot, false)
  assert.equal(reportFilters.parse({ source: 'COLLECTION' }).source, 'COLLECTION')
})
