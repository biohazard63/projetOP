import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { readJson, writeJson } from '../catalog/files'
import type { Catalog } from '../catalog/core'
import { consolidateDefinitions } from '../../src/game/cards/adapter'
import { catalogCardInput } from '../../src/game/cards/catalogAdapter'
import { resolveLeaderLife, type LifeEvidence } from '../../src/game/cards/leaderLife'
import { REVIEWED_CARDS } from '../../src/game/cards/reviewedCards'
import { M0_RULESET } from '../../src/game/rulesets/m0'
import { validateEngineDeck } from '../../src/game/rulesets/decks'

export async function prepareM0() {
  const file = path.resolve('data/onepiece/catalog/master-catalog.json')
  const master = await readJson<Catalog>(file)
  const report = await readJson<{ masterSha256: string; rows: { number: string; variants: string[]; evidence: LifeEvidence[] }[] }>('../docs/game/evidence/leader-life.json')
  if (createHash('sha256').update(await fs.readFile(file)).digest('hex') !== report.masterSha256) throw new Error('Le maître a changé : relancer game:leaders:audit avant préparation')
  const snapshot = await readJson<{ cards: { id: string }[] }>('data/onepiece/sources/local-database.json', { cards: [] })
  const existingIds = new Set(snapshot.cards.map(c => c.id))
  const byNumber = new Map(report.rows.map(r => [r.number, r.evidence]))
  const inputs = master.variants.filter(v => REVIEWED_CARDS[v.number]).map(v => catalogCardInput(v, byNumber.get(v.number) || [], REVIEWED_CARDS[v.number], v.legacyIds.filter(id => existingIds.has(id))))
  const prepared = consolidateDefinitions(inputs)
  const exampleDeck = prepared.definitions.map((d, index) => ({ printingKey: prepared.printings.find(p => p.definitionId === d.definitionId)!.printingKey, quantity: d.category === 'LEADER' ? 1 : index === prepared.definitions.length - 1 ? 2 : 4 }))
  const compositionErrors = validateEngineDeck(exampleDeck, prepared.definitions, prepared.printings, M0_RULESET, 'composition')
  const playabilityErrors = validateEngineDeck(exampleDeck, prepared.definitions, prepared.printings, M0_RULESET)
  // Full coverage of Life, without modifying the original master or its editions/images/IDs.
  const lifeCorrections = master.variants.filter(v => v.text.type.original === 'LEADER').map(v => ({ printingKey: v.key, number: v.number, ...resolveLeaderLife(byNumber.get(v.number) || []) }))
  const result = { schemaVersion: 1, ruleset: M0_RULESET, masterSha256: report.masterSha256, definitions: prepared.definitions, printings: prepared.printings, errors: prepared.errors, lifeCorrections, missingLife: lifeCorrections.filter(c => c.life === null).map(c => c.printingKey), databaseRead: false, databaseModified: false, source: 'local snapshot only; IDs copied, never rekeyed', automaticGameReady: false }
  await writeJson('data/onepiece/game/m0-catalog.json', { ...result, exampleDeck, compositionErrors, playabilityErrors })
  const summary = { definitions: prepared.definitions.length, printings: prepared.printings.length, preservedSnapshotIds: prepared.printings.reduce((n, p) => n + p.databaseIds.length, 0), leadersCorrected: lifeCorrections.filter(c => c.status === 'verified').length, missingLife: result.missingLife, errors: prepared.errors, automaticGameReady: false }
  await writeJson('../docs/game/evidence/m0-preparation.json', { ...summary, compositionErrors, playabilityErrors })
  console.log(JSON.stringify(summary))
  if (prepared.errors.length || result.missingLife.length || compositionErrors.length) process.exitCode = 1
  return result
}
if (process.argv[1]?.endsWith('/prepare-m0.ts')) void prepareM0().catch(e => { console.error(e.message); process.exitCode = 1 })
