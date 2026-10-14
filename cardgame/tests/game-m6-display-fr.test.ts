import test from 'node:test'
import assert from 'node:assert/strict'
import { bridgeCards, engineCatalog } from '../src/lib/engine/catalog'
import { STARTER_DECKS } from '../src/game/cards/starterDecks'

// M6 French display: an official French printing replaces the name, texts and image shown in /play. Rules, certification and
// the engine keep the reviewed English text.
test('M6 /play shows the official French name, text and image when a French printing exists, English otherwise', () => {
  const { display } = bridgeCards([]), { definitions } = engineCatalog()
  const ace = display['OP09-001::standard']
  assert.equal(ace.language, 'fr')
  assert.match(ace.text, /Peut être activé quand votre adversaire attaque/)
  assert.match(ace.imageUrl ?? '', /^https:\/\/fr\.onepiece-cardgame\.com\/images\//)
  assert.equal(definitions.find(d => d.number === 'OP09-001')!.review.effectOriginal.startsWith('[Once Per Turn]'), true, 'rules text unchanged')
  const plain = display['ST05-002::standard']
  assert.equal(plain.language, 'en')
  assert.match(plain.imageUrl ?? '', /^https:\/\/en\.onepiece-cardgame\.com\//)
})

test('M6 /play uses the official French Starter Deck name when one exists (ST-15 onwards)', () => {
  assert.equal(STARTER_DECKS.find(d => d.deckCode === 'ST-17')?.name, 'ST-17 BLEU Don Quijote Doflamingo')
  assert.equal(STARTER_DECKS.find(d => d.deckCode === 'ST-01')?.name, 'ST-01 Straw Hat Crew')
})
