import test from 'node:test'
import assert from 'node:assert/strict'
import { engineCatalog, engineRuleset, playableCardIds, type PrismaCardRow } from '../src/lib/engine/catalog'
import { effectiveStatus } from '../src/game/cards/certification'
import type { CardDefinition } from '../src/game/cards/types'

// The deck builder lists only the owned cards that /play accepts (GET /api/collection?playable=1).
const row = (id: string, d: CardDefinition): PrismaCardRow => ({ id, code: d.number, name: d.rulesName, type: d.category, color: d.colors.join('/'), cost: d.category === 'LEADER' ? d.life ?? null : d.cost,
  power: d.power, counter: d.counter === null ? null : String(d.counter), imageUrl: '', isAltArt: false, isParallel: false, isSpecial: false })

test('deck builder: owned cards are listed only when certified PLAYABLE_VERIFIED and admitted by the ruleset', () => {
  const { definitions } = engineCatalog(), ruleset = engineRuleset()
  const certified = definitions.find(d => d.category === 'CHARACTER' && effectiveStatus(d) === 'PLAYABLE_VERIFIED' && ruleset.allowedNumbers.includes(d.number))!
  const recognisedOnly = definitions.find(d => d.category === 'CHARACTER' && effectiveStatus(d) !== 'PLAYABLE_VERIFIED')!
  assert.ok(certified && recognisedOnly)
  const ids = playableCardIds([row('a', certified), row('b', recognisedOnly), { ...row('c', certified), code: 'ZZ99-999' }])
  assert.deepEqual([...ids], ['a'], 'certified kept; recognised but uncertified, and unknown to the engine, left out')
  // Data that disagrees with the reviewed definition (another power) is not bridged, hence not playable.
  assert.equal(playableCardIds([{ ...row('d', certified), power: (certified.power ?? 0) + 1000 }]).size, 0)
})
