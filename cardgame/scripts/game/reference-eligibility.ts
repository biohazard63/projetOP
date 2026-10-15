import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { computeReferenceEligibility } from '../../src/lib/engine/decks'

// M6 — archives the eligibility verdict of every reference and Starter deck for the current catalogue, so that /api/play/decks
// does not rebuild one game per deck on each cold instance. Run after any change to cards, certifications, ruleset or registry:
// npx tsx scripts/game/reference-eligibility.ts   (tests/play-reference-eligibility.test.ts fails while the file is stale)
const manifest = computeReferenceEligibility()
writeFileSync(resolve('src/lib/engine/reference-eligibility.json'), JSON.stringify(manifest, null, 1) + '\n')
console.log(manifest.fingerprint, manifest.decks.length, 'decks', manifest.decks.filter(d => !d.ok).map(d => d.id).join(' ') || 'all ok')
