import assert from 'node:assert/strict'
import { browser, extractCards, readOptions } from '../scripts/catalog/scraper'
import { identity } from '../scripts/catalog/core'
import { writeJson } from '../scripts/catalog/files'

async function main() {
const b = await browser()
try {
  const page = await b.newPage()
  await page.route('**/*', route => route.abort())
  // Entirely synthetic catalogue, no copyrighted image or remote request.
  await page.setContent(`<select id="series"><option value="">Toutes</option><option value="100">Aube [OP-01]</option><option value="200">Nouvelle famille [XYZ-01]</option></select>
    <a class="modalOpen" data-src="#OP01-001"><img data-src="https://fr.onepiece-cardgame.com/fixture/OP01-001.webp"></a>
    <a class="modalOpen" data-src="#OP01-001_p1"><img data-src="https://fr.onepiece-cardgame.com/fixture/OP01-001_p1.webp"></a>
    ${['OP01-001', 'OP01-001_p1'].map(id => `<dl class="modalCol" id="${id}"><div class="infoCol"><span>OP01-001</span><span>L</span><span>LEADER</span></div><div class="cardName">Leader de test</div><div class="backCol"><div class="cost"><h3>Vie</h3>5</div><div class="power"><h3>Puissance</h3>5000</div><div class="color"><h3>Couleur</h3>Rouge</div><div class="text"><h3>Effet</h3>Piochez 1 carte.</div><div class="getInfo"><h3>Extension</h3>Aube [OP-01]</div></div></dl>`).join('')}`)
  const sets = await readOptions(page, 'fr'); assert.equal(sets.length, 2); assert.equal(sets[1].family, 'XYZ')
  const cards = await extractCards(page); assert.equal(cards.length, 2); assert.equal(cards[0].life, '5'); assert.equal(cards[0].cost, '')
  assert.equal(cards[0].effect, 'Piochez 1 carte.'); assert.notEqual(identity(cards[0]).key, identity(cards[1]).key)
  const result = { status: 'PASS', scope: 'Playwright Chromium, DOM bilingue et variantes sur fixture synthétique locale ; aucune collecte distante.', checks: ['automatic-series-discovery', 'unknown-real-family', 'leader-life-not-cost', 'French-effect', 'stable-alternate-art-key'] }
  await writeJson('../docs/catalog/evidence/playwright-fixture.json', result); console.log(JSON.stringify(result))
} finally { await b.close() }

}
main().catch(e => { console.error(e); process.exitCode = 1 })
