import { test } from 'node:test'
import assert from 'node:assert/strict'
import { identity, memoryKey, rebuild, selectTranslation, stableJson, translationSafety, validateCatalog } from '../scripts/catalog/core'
import { parseHistorical } from '../scripts/catalog/files'
import { discoverOptions, imageFilename, preferFrench } from '../scripts/catalog/scraper'
import { assertLocalDatabase } from '../scripts/catalog/database'
import { prepareTranslationMemory, translateWithLocalService } from '../scripts/catalog/translate'
import { downloadResumable, Throttle } from '../scripts/catalog/scraper'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const source = { file: 'fixture/OP-01.json', setCode: 'OP-01' }
const card = { id: 'OP01-001', code: 'OP01-001', name: 'Monkey D. Luffy', type: 'LEADER', cost: '', power: '5000', rarity: 'L', image: 'https://fr.onepiece-cardgame.com/images/cardlist/card/OP01-001.webp', url: 'https://fr.onepiece-cardgame.com/cardlist/?series=fixture#OP01-001', extension: 'Aube [OP-01]', effect: 'Votre Leader gagne +1000 de puissance.' }
test('standard, alternate and reprint remain distinct without overwriting art', () => {
  const { catalog } = rebuild([{ raw: card, source }, { raw: { ...card, id: 'OP01-001_p1', image: card.image.replace('.webp', '_p1.webp') }, source }, { raw: card, source: { ...source, setCode: 'PRB-01' } }])
  assert.equal(catalog.cards.length, 1); assert.equal(catalog.variants.length, 2)
  assert.deepEqual(catalog.variants.find(v => v.artToken === 'standard')?.extensions, ['OP-01', 'PRB-01'])
  assert.notEqual(imageFilename(card, 'OP-01'), imageFilename({ ...card, image: card.image.replace('.webp', '_p1.webp') }, 'OP-01'))
  assert.notEqual(imageFilename(card, 'OP-01'), imageFilename(card, 'PRB-01'))
  assert.notEqual(imageFilename(card, 'OP-01'), imageFilename({ ...card, image: `${card.image}?new-version` }, 'OP-01'), 'A refreshed image cannot overwrite an earlier authorized file')
  assert.deepEqual(validateCatalog(catalog), [])
})
test('partial and repeated source merges preserve all identities, languages, images and memberships', () => {
  const first = rebuild([{ raw: card, source }]).catalog
  const partial = rebuild([{ raw: { ...card, image: card.image.replace('fr.', 'en.').replace('.webp', '.png') }, source: { file: 'fixture/PRB.json', setCode: 'PRB-01' } }], {}, first).catalog
  assert.equal(partial.variants.length, 1); assert.equal(partial.variants[0].images.length, 2); assert.equal(partial.variants[0].extensions.length, 2)
  assert.deepEqual(rebuild([{ raw: card, source }], {}, partial).catalog, partial)
})
test('French official and validated data outrank English and provisional translation', () => {
  const originals = [{ original: 'Draw 1 card.', language: 'en' as const, status: 'review_required' as const, source: 'english' }, { original: 'Piochez 1 carte.', language: 'fr' as const, status: 'official' as const, source: 'official-fr' }]
  assert.equal(selectTranslation('effect', originals).fr, 'Piochez 1 carte.')
  const memory = { [memoryKey('effect', 'Draw 1 card.')]: { field: 'effect', original: 'Draw 1 card.', fr: 'Piochez 1 carte.', status: 'validated' as const } }
  assert.equal(selectTranslation('effect', originals.slice(0, 1), memory).translationStatus, 'validated')
  assert.equal(selectTranslation('effect', [{ ...originals[0], language: 'fr' }]).fr, null, 'English tagged FR must not be published as French')
})
test('unknown numerics stay null, contradictory rules are reported and never silently replaced', () => {
  const { catalog, conflicts } = rebuild([{ raw: card, source }, { raw: { ...card, power: '6000', cost: 'invalid' }, source }])
  assert.equal(catalog.variants[0].cost, null); assert.equal(catalog.variants[0].power, 5000)
  assert.ok(conflicts.some(c => c.kind === 'numeric_conflict')); assert.ok(conflicts.some(c => c.kind === 'invalid_numeric'))
})
test('JSON NaN repair preserves text, records repair, never writes historical input', () => {
  assert.deepEqual(parseHistorical('[{"id":"OP01-001","effect":"NaN, }","counter":NaN,}]'), { value: [{ id: 'OP01-001', effect: 'NaN, }', counter: null }], repaired: true })
})
test('language-independent stable art key retains the original legacy id', () => {
  assert.equal(identity(card).key, identity({ ...card, image: card.image.replace('fr.', 'en.').replace('.webp', '.png') }).key)
  assert.equal(identity(card).legacyId, card.id)
  assert.throws(() => identity({ id: 'opaque-cuid' }))
})
test('discovery supports arbitrary numbered families and unnamed actual series', () => {
  const fr = discoverOptions([{ value: '', label: 'Toutes' }, { value: '123', label: 'Aube [OP-01]' }, { value: '222', label: 'Mystère [XYZ-12]' }, { value: '333', label: 'Événement spécial' }], 'fr')
  const en = discoverOptions([{ value: '456', label: 'Dawn [OP01]' }], 'en')
  assert.deepEqual(fr.map(s => s.code), ['OP-01', 'XYZ-12', 'SERIES-333']); assert.equal(preferFrench([...en, ...fr]).find(s => s.code === 'OP-01')?.language, 'fr')
})
test('translation guard preserves numbers, card references, DON!! and trait symbols', () => {
  assert.ok(translationSafety('Draw 2 cards, DON!! −1, {FILM}, OP01-001.', 'Piochez 2 cartes, DON!! −1, {FILM}, OP01-001.'))
  assert.ok(!translationSafety('Draw 2 cards.', 'Piochez 3 cartes.'))
  assert.ok(!translationSafety('Play OP01-001.', 'Jouez OP01-002.'))
})
test('production and arbitrary local databases cannot be used for writes', () => {
  assert.throws(() => assertLocalDatabase('postgresql://test:test@example.invalid/db'))
  assert.throws(() => assertLocalDatabase('postgresql://test:test@localhost:5432/mydb', true))
  assert.doesNotThrow(() => assertLocalDatabase('postgresql://op_test:synthetic@127.0.0.1:55432/op_boosters_test', true))
})
test('JSONB object key ordering cannot produce false changes or new import receipts', () => {
  assert.equal(stableJson({ code: 'OP01-001', text: { fr: 'Luffy', original: 'Luffy' } }), stableJson({ text: { original: 'Luffy', fr: 'Luffy' }, code: 'OP01-001' }))
})
test('same-card French reuse is provisional and refuses changed rule numerics', () => {
  const en = { ...card, id: 'OP01-001_p1', url: card.url.replace('fr.', 'en.'), image: card.image.replace('fr.', 'en.').replace('.webp', '_p1.png'), effect: 'Your Leader gains +1000 power.' }
  const c = rebuild([{ raw: card, source }, { raw: en, source }]).catalog
  const memory = prepareTranslationMemory(c, {})
  assert.equal(memory[memoryKey('effect', en.effect)].status, 'machine')
  const changed = rebuild([{ raw: card, source }, { raw: { ...en, effect: 'Your Leader gains +2000 power.' }, source }]).catalog
  assert.equal(prepareTranslationMemory(changed, {})[memoryKey('effect', 'Your Leader gains +2000 power.')], undefined)
})
test('local machine translation is guarded, resumable through memory, never official', async () => {
  const c = rebuild([{ raw: { ...card, url: '', image: card.image.replace('fr.', 'en.'), effect: 'Draw 1 card.' }, source: { ...source, language: 'fr' } }]).catalog
  const request: typeof fetch = async () => new Response(JSON.stringify({ fr: 'Piochez 1 carte.' }), { headers: { 'Content-Type': 'application/json' } })
  const first = await translateWithLocalService(c, {}, 'http://127.0.0.1:9999/translate', 1, request)
  assert.equal(first.translated, 1); assert.equal(Object.values(first.memory)[0].status, 'machine')
  assert.equal((await translateWithLocalService(c, first.memory, 'http://127.0.0.1:9999/translate', 1, request)).translated, 0)
  await assert.rejects(translateWithLocalService(c, {}, 'https://paid.example/translate', 1, request), /distant refusé/)
  const bad: typeof fetch = async () => new Response(JSON.stringify({ fr: 'Piochez 3 cartes.' }))
  assert.equal((await translateWithLocalService(c, {}, 'http://127.0.0.1:9999/translate', 1, bad)).errors.length, 1)
})
test('image download resumes a partial body, verifies content and reuses checksum without requests', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'catalog-image-')); const file = path.join(dir, 'OP-01--OP01-001--standard.png')
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')
  let calls = 0; let read = 0
  t.mock.method(globalThis, 'fetch', async (_url: unknown, options: RequestInit) => {
    calls++
    if (calls === 1) return { ok: true, status: 200, body: { getReader: () => ({ read: async () => { if (read++ === 0) return { value: png.subarray(0, 16), done: false }; throw new Error('Interrupted stream') }, releaseLock() {} }) } }
    assert.equal((options.headers as Record<string, string>).Range, 'bytes=16-')
    return new Response(png.subarray(16), { status: 206, headers: { 'content-range': `bytes 16-${png.length - 1}/${png.length}` } })
  })
  await downloadResumable('https://fr.onepiece-cardgame.com/fixture.png', file, new Throttle(1000), 1)
  assert.deepEqual(await fs.readFile(file), png)
  assert.equal(await downloadResumable('https://fr.onepiece-cardgame.com/fixture.png', file, new Throttle(1000), 1), 'cached')
  assert.equal(calls, 2)
})
