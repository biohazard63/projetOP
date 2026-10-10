import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { digest } from '../scripts/catalog/core'
import { MASTER, writeJson } from '../scripts/catalog/files'

async function main() {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'catalog-cli-')); const fixture = path.join(temp, 'fixture.json')
  const sets = ['OP-01', 'XYZ-99'].map(code => ({ code, family: code.split('-')[0], label: `Fixture [${code}]`, series: code, language: 'fr', url: '' }))
  await writeJson(fixture, { sets, cards: { 'OP-01': [{ id: 'OP01-001', code: 'OP01-001', name: 'Carte de test' }], 'XYZ-99': [{ id: 'XYZ99-001', code: 'XYZ99-001', name: 'Nouveauté de test' }] } })
  const before = digest(await fs.readFile(MASTER, 'utf8'))
  const run = (args: string[]) => JSON.parse(execFileSync(process.execPath, ['scripts/scrape-onepiece-fr.js', '--fixture', fixture, ...args], { encoding: 'utf8' }))
  assert.equal(run(['--list-sets']).sets.length, 2)
  const targeted = run(['--set', 'OP-01,XYZ-99', '--dry-run']); assert.equal(targeted.saved.length, 2)
  const fresh = run(['--sync-new', '--dry-run']); assert.deepEqual(fresh.selectedSets, ['XYZ-99'])
  const update = run(['--sync-new', '--update-existing', '--dry-run']); assert.equal(update.selectedSets.length, 2)
  assert.equal(digest(await fs.readFile(MASTER, 'utf8')), before)
  assert.throws(() => execFileSync(process.execPath, ['scripts/scrape-onepiece-fr.js', '--set', 'OP-01', '--dry-run'], { stdio: 'pipe' }))
  const report = { status: 'PASS', syntheticFixture: true, checks: ['list-sets', 'multiple-targets', 'sync-new-only', 'update-existing', 'dry-run-master-unchanged', 'unauthorized-remote-blocked'] }
  await writeJson('../docs/catalog/evidence/cli-fixture.json', report); console.log(JSON.stringify(report))
}
main().catch(e => { console.error(e); process.exitCode = 1 })
