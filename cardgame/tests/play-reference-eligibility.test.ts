import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { computeReferenceEligibility, deckEligibility, REFERENCE_DECKS, type EligibilityManifest } from '../src/lib/engine/decks'

// The archived verdicts must be exactly what the engine computes for this catalogue: regenerate with
// npx tsx scripts/game/reference-eligibility.ts after any change to cards, certifications, ruleset or registry.
test('the archived reference deck verdicts are current for this catalogue', () => {
  const archived = JSON.parse(readFileSync('src/lib/engine/reference-eligibility.json', 'utf8')) as EligibilityManifest
  assert.deepEqual(archived, computeReferenceEligibility())
  assert.ok(archived.decks.every(d => d.ok), 'every offered deck is playable')
  assert.deepEqual(archived.decks.map(d => d.id), REFERENCE_DECKS.map(d => d.id))
})

test('a deck outside the archive is still checked by the engine', () => {
  const entries = structuredClone(REFERENCE_DECKS[0].entries)
  entries[1] = { ...entries[1], quantity: entries[1].quantity + 1 }
  assert.equal(deckEligibility(entries).ok, false)
})
