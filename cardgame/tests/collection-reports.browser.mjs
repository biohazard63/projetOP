import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { config } from 'dotenv'
import { encode } from 'next-auth/jwt'

// Local UI, synthetic session and intercepted API calls: no database writes.
config({ path: ['.env.local', '.env'], quiet: true })
const base = process.env.UI_BASE_URL || 'http://localhost:3000'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local target required')
const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
if (!secret) throw Error('LOCAL_AUTH_SECRET_REQUIRED')
const token = await encode({ secret, salt: 'next-auth.session-token', maxAge: 300, token: { id: 'collection-report-fixture', email: 'fixture@example.test' } })
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
    await page.context().addCookies([{ name: 'next-auth.session-token', value: token, url: base, httpOnly: true, sameSite: 'Lax' }])
    const reports = [], errors = []
    let attempts = 0
    page.on('pageerror', error => errors.push(error.message))
    const card = { id: 'collection-fixture', code: 'OP01-001_p1', name: 'Carte collection test', rarity: 'SR', type: 'CHARACTER', color: 'RED', cost: 3, power: 5000, counter: '1000', set: 'Test', setCode: 'OP-01', imageUrl: '/images/card-back.jpg', isAltArt: true, isParallel: null, isSpecial: null }
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url())
      let data = {}, status = 200
      if (url.pathname === '/api/auth/session') data = { user: { id: 'collection-report-fixture', email: 'fixture@example.test' }, expires: '2099-01-01' }
      else if (url.pathname === '/api/berries') data = { balance: 1000000, economy: { prices: { booster: 1000, display: 20000 }, events: [] } }
      else if (url.pathname === '/api/cards') data = [card]
      else if (url.pathname === '/api/cards/collection-fixture') {
        attempts++
        if (attempts === 1) { status = 503; data = { error: 'UNAVAILABLE' } }
        else data = { ...card, effect: 'Original effect', ability: 'Full ability', trigger: 'Original trigger', family: 'Family test', attribute: 'Slash' }
      } else if (url.pathname === '/api/cards/text') data = { texts: { [card.id]: { effect: 'Texte français affiché', trigger: 'Trigger français', source: 'official' } } }
      else if (url.pathname === '/api/collection') data = { cards: [{ id: card.id, quantity: 2, acquiredAt: new Date().toISOString() }] }
      else if (url.pathname === '/api/user/cards') data = { favorites: [] }
      else if (url.pathname === '/api/collector') data = { profile: { name: 'Fixture' }, total: 2, unique: 1, catalogue: 1, percentage: 100, decks: 0, openings: 0, alternatives: 1, ownedAlternatives: 1, sets: [] }
      else if (url.pathname === '/api/reports') {
        assert.equal(route.request().method(), 'POST')
        reports.push(route.request().postDataJSON())
        if (reports.length === 1) { status = 503; data = { error: 'UNAVAILABLE' } }
        else data = { id: 'report-fixture' }
      }
      await route.fulfill({ json: data, status })
    })
    await page.goto(`${base}/collection`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.getByRole('button', { name: `Carte ${card.name}, ${card.code}`, exact: true }).click()
    const modal = page.getByRole('dialog')
    await modal.getByRole('button', { name: 'Réessayer le chargement' }).click()
    await modal.getByText('Full ability', { exact: true }).waitFor()
    await modal.getByRole('button', { name: 'Cette carte n’est pas une alternative' }).click()
    await modal.getByText(/Informations de la carte jointes/).click()
    assert.match(await modal.innerText(), /Family test/)
    await modal.getByRole('button', { name: 'Envoyer le signalement' }).click()
    await modal.getByRole('alert').filter({ hasText: /Envoi indisponible/ }).waitFor()
    await modal.getByRole('button', { name: 'Envoyer le signalement' }).click()
    await modal.getByRole('status').filter({ hasText: /enregistré/ }).waitFor()
    assert.equal(reports.length, 2)
    assert.equal(reports[0].requestId, reports[1].requestId)
    assert.equal(reports[1].source, 'COLLECTION')
    assert.deepEqual(reports[1].context, { pathname: '/collection' })
    assert.equal(reports[1].card.id, card.id)
    assert.equal(reports[1].card.effect, 'Original effect')
    assert.equal(reports[1].card.ability, 'Full ability')
    assert.equal(reports[1].card.displayedEffect, 'Texte français affiché')
    assert.equal(reports[1].card.isAltArt, true)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No page overflow')
    assert.deepEqual(errors, [])
    console.log(`PASS: collection report ${width}px, full card/translation, loading retry and idempotent submission retry; no database writes`)
    await page.close()
  }
} finally { await browser.close() }
