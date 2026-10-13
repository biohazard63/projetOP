import test from 'node:test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { loadStarterDeckSource } from '../src/game/cards/starterDeckSource'
import { resolveByRebuildScriptName, resolveStarterCompositionName } from '../src/game/cards/starterCompositionResolution'

function localRows(set: string) {
  return loadStarterDeckSource(set).records.map(card => ({
    code: card.source.code,
    name: card.name,
    type: card.source.type,
  }))
}

test('resolves only verified ST-03 to ST-06 composition aliases against their local card rows', () => {
  assert.deepEqual(resolveStarterCompositionName('ST-04', "All-Star 'Calamity'", localRows('ST-04')), {
    number: 'ST04-014', status: 'RESOLVED', method: 'VERIFIED_ALIAS',
  })
  assert.deepEqual(resolveStarterCompositionName('ST-06', 'Navy Headquarters', localRows('ST-06')), {
    number: 'ST06-017', status: 'RESOLVED', method: 'VERIFIED_ALIAS',
  })
  assert.deepEqual(resolveStarterCompositionName('ST-05', 'Karina', localRows('ST-05')), {
    number: 'ST05-005', status: 'RESOLVED', method: 'VERIFIED_ALIAS',
  })
  assert.deepEqual(resolveStarterCompositionName('ST-05', 'Guild Tesoro', localRows('ST-05')), {
    number: 'ST05-006', status: 'RESOLVED', method: 'VERIFIED_ALIAS',
  })
  assert.deepEqual(resolveStarterCompositionName('ST-05', 'Scarlett', localRows('ST-05')), {
    number: 'ST05-009', status: 'RESOLVED', method: 'VERIFIED_ALIAS',
  })
})

test('ST-03 Desert Spada and Perfume Femur follow the rebuild script: absent from ST-03, found by its cross-set name lookup', () => {
  const allRows = readdirSync('carteJson', { withFileTypes: true }).filter(d => d.isDirectory() && existsSync(join('carteJson', d.name, `cards-${d.name}.json`)))
    .flatMap(d => JSON.parse(readFileSync(join('carteJson', d.name, `cards-${d.name}.json`), 'utf8')) as { code: string; name: string; type: string }[])
  for (const [name, number] of [['Desert Spada', 'OP01-088'], ['Perfume Femur', 'OP07-057']]) {
    assert.deepEqual(resolveStarterCompositionName('ST-03', name, localRows('ST-03')), { number: null, status: 'NOT_FOUND', candidates: [] })
    assert.deepEqual(resolveByRebuildScriptName(name, allRows, false), { number, status: 'RESOLVED', method: 'REBUILD_SCRIPT_NAME' })
  }
  // Several card numbers for one name stay ambiguous (the script's first match depends on database order).
  assert.equal(resolveByRebuildScriptName('Boa Hancock', allRows, false).status, 'AMBIGUOUS')
})

test('keeps legacy names with unresolved local-title equivalence blocked and lists local alternatives', () => {
  assert.deepEqual(resolveStarterCompositionName('ST-05', 'Shishi Odoshi Goshojimaki', localRows('ST-05')), {
    number: null, status: 'AMBIGUOUS', candidates: ['ST05-016', 'ST05-017'],
  })
  assert.deepEqual(resolveStarterCompositionName('ST-05', 'Armor Mode', localRows('ST-05')), {
    number: null, status: 'AMBIGUOUS', candidates: ['ST05-016', 'ST05-017'],
  })
})
