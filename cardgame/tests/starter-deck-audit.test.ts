import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { STARTER_LIST, simulateStarterDecks } from '../scripts/rebuildStarterDecks'
import evidence from '../scripts/starterAudit/product-evidence.json'
import { auditDeck, canonicalCardNumber, resolveCard, type CatalogCard, type CardSpec, type ProductEvidence } from '../scripts/starterAudit/validation'

const script = readFileSync('scripts/rebuildStarterDecks.ts', 'utf8')

test('starter audit never deletes or resets existing decks', () => {
  assert.doesNotMatch(script, /prisma\.deck\.delete|--reset/)
})

test('starter audit never writes incomplete compositions', () => {
  assert.doesNotMatch(script, /prisma\.(?:deck|deckVersion|deckCard)\.create/)
})

test('starter script is safe to import and does not select a first name match', () => {
  assert.doesNotMatch(script, /best\s*=\s*c;\s*break/)
  assert.match(script, /import\.meta\.url|require\.main/)
})

const character: CatalogCard = { id: 'base', code: 'ST01-002', name: 'Usopp', type: 'CHARACTER', color: 'Red', cost: 2, power: 2000, counter: '1000',
  effect: 'effect', imageUrl: 'https://en.onepiece-cardgame.com/images/cardlist/card/ST01-002.png', isAltArt: false, isParallel: false, isSpecial: false }
const spec: CardSpec = { name: 'Usopp', quantity: 4, cardNumber: 'ST01-002', type: 'CHARACTER' }

test('canonical identity preserves distinct card numbers and strips only known print suffixes', () => {
  assert.equal(canonicalCardNumber('ST01-002_p3'), 'ST01-002')
  assert.equal(canonicalCardNumber('OP10-101_r1'), 'OP10-101')
  assert.equal(canonicalCardNumber('ST01-002-extra'), null)
  assert.notEqual(canonicalCardNumber('ST01-002'), canonicalCardNumber('OP01-002'))
})

test('number takes precedence over translated names and never falls back when missing', () => {
  const result = resolveCard({ ...spec, name: 'Usopp FR title' }, [character])
  assert.equal(result.status, 'RESOLVED')
  assert.equal(resolveCard({ ...spec, cardNumber: 'ST02-002' }, [character]).status, 'BLOCKED')
})

test('visual variants of the same numbered card do not block its identity', () => {
  const alt = { ...character, id: 'alt', imageUrl: 'https://en.onepiece-cardgame.com/images/cardlist/card/ST01-002_p1.png', isAltArt: true }
  const result = resolveCard(spec, [alt, character])
  assert.equal(result.status, 'RESOLVED')
  if (result.status === 'RESOLVED') {
    assert.equal(result.variantKind, 'VISUAL_VARIANTS')
    assert.equal(result.card?.id, 'base')
    assert.deepEqual(result.variants, ['alt', 'base'])
  }
})

test('identical duplicate imports are identified without choosing an arbitrary Prisma ID', () => {
  const result = resolveCard(spec, [character, { ...character, id: 'another-import' }])
  assert.equal(result.status, 'RESOLVED')
  if (result.status === 'RESOLVED') {
    assert.equal(result.variantKind, 'POTENTIAL_DUPLICATE_IMPORTS')
    assert.equal(result.card, null)
    assert.equal(result.appearance, 'NEEDS_SELECTION')
  }
})

test('an explicit printing ID resolves appearance only after checking the shared game identity', () => {
  const records = [character, { ...character, id: 'another-import' }]
  const result = resolveCard({ ...spec, prismaId: 'another-import' }, records)
  assert.equal(result.status, 'RESOLVED')
  if (result.status === 'RESOLVED') assert.equal(result.card?.id, 'another-import')
  assert.equal(resolveCard({ ...spec, prismaId: 'another-import' }, [character, { ...character, id: 'another-import', power: 3000 }]).status, 'BLOCKED')
})

test('different effects and printed characteristics are never silently merged', () => {
  for (const delta of [{ power: 3000 }, { effect: 'different effect' }, { cost: null }, { type: 'LEADER' }]) {
    assert.equal(resolveCard(spec, [character, { ...character, id: 'conflicting', ...delta }]).status, 'BLOCKED')
  }
})

test('French standard artwork is preferred when the official printing identity permits it', () => {
  const french = { ...character, id: 'fr', color: 'Rouge', imageUrl: 'https://fr.onepiece-cardgame.com/images/cardlist/card/ST01-002.webp' }
  const result = resolveCard({ ...spec, printingCode: 'ST01-002' }, [character, french])
  assert.equal(result.status, 'RESOLVED')
  if (result.status === 'RESOLVED') assert.equal(result.card?.id, 'fr')
})

test('a known reprint can be the default only through its explicit official printing code', () => {
  const reprint = { ...character, id: 'reprint', imageUrl: 'https://fr.onepiece-cardgame.com/images/cardlist/card/ST01-002_r1.webp', isAltArt: true }
  const result = resolveCard({ ...spec, printingCode: 'ST01-002_r1' }, [character, reprint])
  assert.equal(result.status, 'RESOLVED')
  if (result.status === 'RESOLVED') assert.equal(result.card?.id, 'reprint')
})

test('name fallback refuses two different numbered cards called Usopp', () => {
  const other = { ...character, id: 'other', code: 'OP01-002' }
  const result = resolveCard({ ...spec, cardNumber: undefined }, [character, other])
  assert.equal(result.status, 'BLOCKED')
  if (result.status === 'BLOCKED') assert.equal(result.reason, 'AMBIGUOUS_NAME')
})

test('name fallback respects the requested Leader/Character type without flipping it', () => {
  const leader = { ...character, id: 'leader', type: 'LEADER', code: 'ST01-001' }
  assert.equal(resolveCard({ ...spec, cardNumber: undefined, type: 'LEADER' }, [character]).status, 'BLOCKED')
  const result = resolveCard({ ...spec, cardNumber: undefined, type: 'LEADER' }, [character, leader])
  assert.equal(result.status, 'RESOLVED')
  if (result.status === 'RESOLVED') assert.equal(result.card?.id, 'leader')
})

test('invalid quantities and noncanonical numbers are rejected', () => {
  for (const quantity of [0, -1, 1.5, Number.NaN]) assert.equal(resolveCard({ ...spec, quantity }, [character]).status, 'BLOCKED')
  assert.equal(resolveCard({ ...spec, cardNumber: 'ST01-002_p1' }, [character]).status, 'BLOCKED')
})

test('simulation explicitly distinguishes absence of Prisma validation', () => {
  const result = simulateStarterDecks(null)
  assert.equal(result.mode, 'DRY_RUN_ONLY')
  assert.equal(result.databaseChecked, false)
  assert.equal(result.counts.VERIFIED, 0)
})

test('ST10 and ST13 preserve three commercial Leaders with 50 main cards and separate DON', () => {
  for (const code of ['ST-10', 'ST-13'] as const) {
    const deck = STARTER_LIST.find(deck => deck.deckCode === code)!
    assert.equal(deck.cards.filter(card => card.type === 'LEADER').length, 3)
    assert.equal(deck.cards.filter(card => card.type !== 'LEADER').reduce((sum, card) => sum + card.quantity, 0), 50)
    assert.equal(deck.cards.reduce((sum, card) => sum + card.quantity, 0), 53)
    assert.equal(evidence[code].donCount, 10)
    assert.ok(!deck.cards.some(card => card.name.includes('DON!!')))
  }
})

test('extra Leaders are selectable alternatives, not extra main cards', () => {
  const deck = STARTER_LIST.find(deck => deck.deckCode === 'ST-10')!
  const data = evidence['ST-10'] as ProductEvidence
  const result = auditDeck(deck, data, prismaSnapshot.rows)
  assert.equal(result.status, 'VERIFIED')
  assert.equal(result.playable.length, 3)
  assert.ok(result.playable.every(option => option.structuralLegal && option.mainCount === 50))
})

test('source conflicts stay PARTIAL even if candidate compositions contain 50 main cards', () => {
  for (const code of ['ST-24', 'ST-27'] as const) {
    assert.equal(evidence[code].compositionVerified, false)
    assert.ok(evidence[code].reasons.length > 0)
  }
})

test('ST08 Event quantities and ST12 Leader typo have independent corroboration', () => {
  const deck = STARTER_LIST.find(deck => deck.deckCode === 'ST-08')!
  assert.equal(deck.cards.find(card => card.cardNumber === 'ST08-014')?.quantity, 4)
  assert.equal(deck.cards.find(card => card.cardNumber === 'ST08-015')?.quantity, 2)
  assert.equal(evidence['ST-08'].compositionVerified, true)
  assert.ok(evidence['ST-08'].sources.some(source => source.includes('pokemondeal.com')))
  assert.equal(evidence['ST-12'].compositionVerified, true)
  assert.ok(evidence['ST-12'].sources.some(source => source.includes('onepiece-card-labo.com')))
})

const prismaSnapshot = JSON.parse(readFileSync('../docs/game/evidence/starter-audit-2026-10-14/prisma-cards-readonly.json', 'utf8')) as { rows: CatalogCard[] }

test('real French alternate Chopper cards are verified by official localized references', () => {
  const deck = STARTER_LIST.find(deck => deck.deckCode === 'ST-01')!
  const card = deck.cards.find(card => card.cardNumber === 'ST01-006')!
  assert.equal(card.name, 'Tony-Tony Chopper')
  const result = resolveCard(card, prismaSnapshot.rows, evidence['ST-01'].localizedReferences)
  assert.equal(result.status, 'RESOLVED')
  if (result.status === 'RESOLVED') {
    assert.ok(result.variants.includes('ST01-006_p3'))
    assert.equal(result.card?.id, 'ST01-006')
  }
})

test('a single incorrect printing is refused against Bandai characteristics', () => {
  const deck = STARTER_LIST.find(deck => deck.deckCode === 'ST-02')!
  const card = deck.cards.find(card => card.cardNumber === 'ST02-002')!
  const record = prismaSnapshot.rows.find(row => row.id === 'ST02-002')!
  const result = resolveCard(card, [{ ...record, power: (record.power ?? 0) + 1000 }], evidence['ST-02'].localizedReferences)
  assert.equal(result.status, 'BLOCKED')
  if (result.status === 'BLOCKED') assert.equal(result.reason, 'OFFICIAL_CHARACTERISTIC_MISMATCH')
})

test('real FR base and alternate Life Leader prints preserve canonical identity and prefer FR base', () => {
  const deck = STARTER_LIST.find(deck => deck.deckCode === 'ST-29')!
  const leader = deck.cards.find(card => card.type === 'LEADER')!
  const result = resolveCard(leader, prismaSnapshot.rows, evidence['ST-29'].localizedReferences)
  assert.equal(result.status, 'RESOLVED')
  if (result.status === 'RESOLVED') {
    assert.equal(result.card?.id, 'ST29-001')
    assert.ok(result.variants.includes('ST29-001_p1'))
  }
})

test('ST36 quantities are not invented and ST37..39 are not introduced', () => {
  assert.equal(Object.keys(evidence).length, 36)
  assert.equal(evidence['ST-36'].compositionVerified, false)
  assert.ok(!STARTER_LIST.some(deck => ['ST-36', 'ST-37', 'ST-38', 'ST-39'].includes(deck.deckCode)))
})

test('write options are rejected before any Prisma initialization', () => {
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/rebuildStarterDecks.ts', '--apply'], { encoding: 'utf8' })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /No deck was written/)
})

for (const deck of STARTER_LIST) {
  test(`${deck.deckCode}: candidate reference preserves published total and all numbered identities`, () => {
    const data = evidence[deck.deckCode as keyof typeof evidence]
    assert.equal(deck.cards.filter(card => card.type !== 'LEADER').reduce((sum, card) => sum + card.quantity, 0), 50)
    assert.deepEqual(deck.cards.filter(card => card.type === 'LEADER').map(card => card.cardNumber).sort(), data.leaders)
    assert.equal(data.donCount, 10)
    assert.ok(deck.cards.every(card => data.officialCards.some(row => row.cardNumber === card.cardNumber && row.type === card.type && row.name === card.name)))
  })
}
