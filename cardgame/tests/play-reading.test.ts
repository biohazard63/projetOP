import test from 'node:test'
import assert from 'node:assert/strict'
import { readingDuration, readingTimeout } from '../src/components/play/presentationTiming'

// V2 reading popups: card text stays on screen long enough to be read, and the keywords look like the printed cards.
test('reading time grows with the text, between 4 and 12 seconds; manual mode waits for the player', () => {
  assert.equal(readingDuration('Court'), 4000)
  assert.equal(readingDuration('x'.repeat(100)), 8000)
  assert.equal(readingDuration('x'.repeat(1000)), 12000)
  assert.equal(readingTimeout(8000, 'auto'), 8000)
  assert.equal(readingTimeout(8000, 'fast'), 4000)
  assert.equal(readingTimeout(8000, 'manual'), null)
})

test('only official keywords are boxed, in the colours of the cards; card names in brackets stay plain', async () => {
  const React = await import('react'), { renderToStaticMarkup } = await import('react-dom/server')
  const { CardText, keywordTone } = await import('../src/components/play/CardText')
  for (const [word, tone] of [['On Play', 'timing'], ['Jouée', 'timing'], ['Activation : Principale', 'timing'], ['Counter', 'counter'], ['Trigger', 'trigger'], ['Déclenchement', 'trigger'],
    ['Blocker', 'ability'], ['Initiative', 'ability'], ['Once Per Turn', 'once'], ['DON!! x2', 'don']] as const) assert.equal(keywordTone(word), tone, word)
  assert.equal(keywordTone('Uta'), null); assert.equal(keywordTone('Monkey.D.Luffy'), null)
  const html = renderToStaticMarkup(React.createElement(CardText, { text: '[Jouée] DON!! −1 : piochez 1 carte si votre Leader est [Uta].\n[Déclenchement] Jouez cette carte.' }))
  assert.match(html, /<span class="op-kw timing">Jouée<\/span>/)
  assert.match(html, /<span class="op-kw don">DON!! −1<\/span>/)
  assert.match(html, /<span class="op-kw trigger">Déclenchement<\/span>/)
  assert.match(html, /\[Uta\]/)
  assert.equal((html.match(/<p>/g) ?? []).length, 2)
})
