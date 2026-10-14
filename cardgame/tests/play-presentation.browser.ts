import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { config } from 'dotenv'
import { encode } from 'next-auth/jwt'
import { counterFixture } from './play-presentation-fixture'
import { cardName } from '../src/components/play/model'
import { animationSteps, lastSequence } from '../src/components/play/anim'

async function main() {
config({ path: ['.env.local', '.env'], quiet: true })
if (!process.env.NEXTAUTH_SECRET) throw new Error('LOCAL_AUTH_SECRET_REQUIRED')
const token = await encode({ secret: process.env.NEXTAUTH_SECRET, salt: 'next-auth.session-token', maxAge: 600, token: { id: 'feel-preview', sub: 'feel-preview', name: 'Presentation preview' } })
const evidence = path.resolve('../docs/game/evidence/play-game-feel')
fs.mkdirSync(evidence, { recursive: true })
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const results: unknown[] = []
try {
  for (const [width, height, category] of [[1440,900,'CHARACTER'],[844,390,'CHARACTER'],[1366,768,'EVENT']] as const) {
    const f = await counterFixture(category)
    let current = f.view
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'no-preference', hasTouch: height === 390, isMobile: height === 390 })
    await page.context().addCookies([{ name: 'next-auth.session-token', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }])
    const transitions: unknown[] = []
    const errors: string[] = []
    page.on('pageerror', e => errors.push(String(e)))
    await page.route('**/api/**', r => r.fulfill({ json: {} }))
    await page.route('**/api/play/**', async route => {
      const request = route.request(), pathname = new URL(request.url()).pathname
      if (pathname.endsWith('/commands')) {
        const body = request.postDataJSON()
        const before = current
        try {
          const reply = await f.play.command(f.uid, current.gameId, body)
          current = reply.view
          transitions.push({ command: body.intent, before, after: current, presentation: animationSteps(before, current, lastSequence(before)) })
          fs.writeFileSync(path.join(evidence, `trace-${category}-${width}.json`), JSON.stringify({ source: 'Real PlayService, MemoryGameRepository, validated commands only', seed: f.seed, deck: f.deck, transitions }, null, 2))
          return route.fulfill({ json: { game: current, replayed: reply.replayed } })
        } catch (error) { return route.fulfill({ status: 422, json: { error: String(error) } }) }
      }
      return route.fulfill({ json: pathname.endsWith('/stats') ? { stats: { played:0,wins:0,losses:0,concessions:0,byDeck:{},byLevel:{} } } : { game: current } })
    })
    await page.route('**/api/auth/session', r => r.fulfill({ json: { user: { id: 'feel-preview' }, expires: '2099-01-01T00:00:00Z' } }))
    await page.goto('http://localhost:3000/play', { waitUntil: 'domcontentloaded' })
    await page.locator('.tbl-decision').waitFor({ timeout: 30000 })
    const beforeRect = await page.locator('.tbl-field').boundingBox()
    await page.clock.install()
    await page.clock.pauseAt(Date.now() + 10000)
    await page.getByRole('button', { name: f.label, exact: true }).first().click()
    if (await page.getByRole('button', {name:'Confirmer',exact:true}).count()) await page.getByRole('button', {name:'Confirmer',exact:true}).click()
    const preview = page.locator('[data-anim="counter"]')
    await preview.waitFor({ timeout: 20000 })
    if (category === 'EVENT' && await page.locator('.play-pick-grid').count()) {
      assert.equal(await page.getByRole('button',{name:'Valider',exact:true}).isDisabled(),true)
      await page.locator('.play-pick-grid').getByRole('button',{name:cardName(f.view,f.view.projection.battle!.target),exact:true}).click()
      await page.getByRole('button',{name:'Valider',exact:true}).click()
      await page.locator('.play-pick-grid').waitFor({state:'detached'})
    }
    assert.ok((await preview.innerText()).includes(f.card.name))
    assert.ok((await preview.innerText()).includes(category === 'CHARACTER' ? 'Counter +' : 'Événement'))
    assert.equal(await page.getByRole('button', { name: 'Continuer sans autre Counter', exact: true }).isEnabled(), true, 'decision available while decorative Counter animates')
    await page.clock.runFor(400)
    const box = await preview.boundingBox(), surface = await page.locator('.play-surface').boundingBox(), cardBox = await preview.locator('.play-card').boundingBox(), decision = await page.locator('.tbl-decision').boundingBox()
    fs.writeFileSync(path.join(evidence, `geometry-${width}.json`), JSON.stringify({box,decision,surface,cardBox,css:await preview.evaluate(e=>({top:getComputedStyle(e).top,transform:getComputedStyle(e).transform,animation:getComputedStyle(e).animationName}))},null,2))
    await page.screenshot({ path: path.join(evidence, `counter-${category}-${width}x${height}.png`), style: '.tbl-stage { animation:none!important; opacity:1!important }' })
    assert.ok(box && surface && cardBox && box.y >= surface.y && cardBox.y >= surface.y && box.y + box.height <= height, 'preview and full card within surface')
    assert.ok(box && decision && box.y + box.height <= decision.y + 1, 'preview must not conceal decision buttons')
    await page.screenshot({ path: path.join(evidence, `counter-${category}-${width}x${height}.png`), style: '.tbl-stage { animation:none!important; opacity:1!important }' })
    await page.getByRole('button', { name: 'Maintenir à l’écran', exact:true }).click()
    await page.clock.runFor(5000)
    assert.equal(await preview.count(), 1, 'manual hold retains decoration without holding the decision')
    await page.getByRole('button', { name: 'Reprendre', exact:true }).click()
    await page.clock.runFor(400)
    assert.equal(await preview.count(), 1, 'Counter still readable after 400 ms')
    assert.deepEqual(await page.locator('.tbl-field').boundingBox(), beforeRect, 'preview never resizes board')
    await page.getByRole('button', { name: 'Passer l’animation', exact: true }).click()
    await preview.waitFor({ state: 'detached' })
    if (category === 'CHARACTER') {
      const second = page.getByRole('button', { name: f.label, exact:true }).first()
      if (await second.count()) await second.click()
      await page.getByRole('button', { name: 'Continuer sans autre Counter', exact:true }).click()
      for (let i=0; i<40 && !(await page.locator('[data-anim="combat"]').count()); i++) await page.clock.runFor(500)
      const outcome = page.locator('[data-anim="combat"]')
      assert.equal(await outcome.count(), 1, 'confirmed combat has its own outcome animation')
      assert.ok((await outcome.innerText()).includes('Vous remportez le combat'), 'real two-Counter defence is announced')
      await page.screenshot({ path:path.join(evidence, `combat-${width}x${height}.png`), style:'.tbl-stage {animation:none!important;opacity:1!important}' })
    }
    await page.getByRole('button', { name: 'Menu de la partie', exact: true }).click()
    await page.getByLabel('Mode rapide (animations uniquement)').check()
    await page.getByLabel('Réduites', { exact: true }).check()
    await page.getByRole('button', { name: 'Fermer', exact: true }).click()
    await page.clock.runFor(300)
    assert.equal(await page.locator('[data-anim]').count(), 0, 'reduced motion skips only decoration')
    assert.equal(errors.length, 0, errors.join('\n'))
    results.push({ viewport: `${width}x${height}`, category, card: f.card.number, seed: f.seed, deck: f.deck, preview: box, decision, immediatelyAvailable:true, geometryStable:true, reducedMotion:true, status:'PASS' })
    await page.close()
  }
} finally {
  await browser.close()
  fs.writeFileSync(path.join(evidence, 'browser-results.json'), JSON.stringify(results, null, 2))
}
console.log(JSON.stringify(results, null, 2))

}
main().catch(error => { console.error(error); process.exitCode = 1 })
