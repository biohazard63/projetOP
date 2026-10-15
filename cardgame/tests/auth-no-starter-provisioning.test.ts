import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

for (const file of ['src/lib/auth.config.ts', 'src/app/api/auth/register/route.ts']) {
  test(`${file} does not provision starter cards or decks during signup`, () => {
    const source = readFileSync(file, 'utf8')
    assert.doesNotMatch(source, /starterDeckUtils|addStarterDeckCardsToUser|hasStarterDecks/)
  })
}
