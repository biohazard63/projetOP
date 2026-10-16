import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { cardDisplay, engineCatalog } from '../src/lib/engine/catalog'
import { englishFingerprint, frenchText, unofficialText } from '../src/lib/cards/frenchText'
import translations from '../src/lib/cards/translations-fr.json'

const files = (dir: string): string[] => readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : [p] })

test('the rules engine never reads the French texts (display only)', () => {
  for (const file of files('src/game').filter(f => /\.(ts|tsx)$/.test(f)))
    assert.doesNotMatch(readFileSync(file, 'utf8'), /translations-fr|cards\/frenchText/, file)
})

test('showing a translated card leaves its definition untouched', () => {
  const definitions = engineCatalog().definitions
  const before = JSON.stringify(definitions)
  const shown = definitions.map(d => cardDisplay(d, null))
  assert.equal(JSON.stringify(definitions), before)
  for (const [i, d] of definitions.entries()) if (shown[i].translation) assert.equal(shown[i].language, 'en', d.number)
})

test('each unofficial translation is well formed and bound to its English text', () => {
  const cards = translations.cards as Record<string, { effect?: string; trigger?: string; en: string }>
  for (const [number, t] of Object.entries(cards)) {
    assert.match(number, /^[A-Z]+\d*-\d{3}$/, number)
    assert.match(t.en, /^[0-9a-f]{16}$/, number)
    assert.ok(t.effect || t.trigger, number)
  }
})

test('a translation is used only for the exact English text it was made from', () => {
  const [number, t] = Object.entries(translations.cards as Record<string, { effect?: string; trigger?: string; en: string }>)[0] ?? []
  if (!number) return
  assert.equal(unofficialText(number, 'Some other English text.', ''), null)
  assert.equal(frenchText({ id: number, code: number, effect: 'Some other English text.', trigger: '' }), null)
  assert.notEqual(englishFingerprint('a', ''), englishFingerprint('b', ''))
  assert.ok(t)
})
