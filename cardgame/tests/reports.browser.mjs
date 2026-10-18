import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { config } from 'dotenv'
import { encode } from 'next-auth/jwt'

config({ path: ['.env.local', '.env'], quiet: true })
const base = process.env.UI_BASE_URL || 'http://localhost:3000'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local target required')
if (!process.env.NEXTAUTH_SECRET) throw Error('LOCAL_AUTH_SECRET_REQUIRED')
const token = await encode({ secret: process.env.NEXTAUTH_SECRET, salt: 'next-auth.session-token', maxAge: 300, token: { id: 'reports-fixture', name: 'Test local', email: 'reports@example.test' } })
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
  await page.context().addCookies([{ name: 'next-auth.session-token', value: token, url: base, httpOnly: true, sameSite: 'Lax' }])
  await page.addInitScript(() => localStorage.setItem('mugiwara:display:reports-fixture', JSON.stringify({ quickOpening: true, animations: false })))
  const reports = [], errors = []
  page.on('pageerror', e => errors.push(e.message))
  const card = { id: 'fixture-alt', code: 'OP01-001_p1', name: 'Carte signalée', rarity: 'SR', type: 'CHARACTER', color: 'RED', cost: 3, power: 5000, counter: '1000', effect: 'Texte de test.', family: 'Famille test', attribute: 'Slash', imageUrl: '/images/card-back.jpg', isAltArt: true, isParallel: false, isSpecial: false, drawVariant: 'alt', drawTier: 'ALT', position: 0, isNew: true, isDuplicate: false, quantityBefore: 0 }
  const opening = { id: 'opening-test', setCode: 'OP-01', setName: 'Test local', cards: [card], openedAt: new Date().toISOString() }
  const view = JSON.parse(fs.readFileSync('../docs/game/evidence/play-game-feel/layout-source-view.json', 'utf8'))
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    let data = {}, status = 200
    if (path === '/api/auth/session') data = { user: { id: 'reports-fixture', name: 'Test local', email: 'reports@example.test' }, expires: '2099-01-01' }
    else if (path === '/api/berries') data = { balance: 1000000, economy: { prices: { booster: 1000, display: 20000 }, events: [] } }
    else if (path === '/api/booster') data = { sets: [{ code: 'OP-01', name: 'Test local', available: true, cardCount: 1, packSize: 1 }] }
    else if (path === '/api/booster/history') data = { openings: [], nextCursor: null }
    else if (path === '/api/booster/open') data = { opening }
    else if (path === '/api/reports') {
      assert.equal(route.request().method(), 'POST')
      reports.push(route.request().postDataJSON())
      if (reports.length === 1) { status = 503; data = { error: 'REPORTS_UNAVAILABLE' } }
      else data = { id: `report-${reports.length}` }
    } else if (path.startsWith('/api/play/')) {
      assert.equal(route.request().method(), 'GET', 'No game mutations')
      data = path.endsWith('/stats') ? { stats: { played: 0, wins: 0, losses: 0, concessions: 0, byDeck: {}, byLevel: {} } } : path.endsWith('/decks') ? { reference: [], user: [] } : { game: view }
    }
    await route.fulfill({ json: data, status })
  })
  await page.goto(`${base}/booster-opening?set=OP-01`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Ouvrir le booster/ }).first().click()
  await page.getByRole('button', { name: /Détails de Carte signalée/ }).click()
  const modal = page.getByRole('dialog')
  await modal.getByRole('button', { name: 'Cette carte n’est pas une alternative' }).click()
  await modal.getByText(/Informations de la carte jointes/).click()
  assert.match(await modal.innerText(), /OP01-001_p1/)
  assert.match(await modal.innerText(), /Famille test/)
  await modal.getByRole('button', { name: 'Envoyer le signalement' }).click()
  await modal.getByRole('alert').filter({ hasText: /Envoi indisponible/ }).waitFor()
  assert.match(await modal.getByRole('textbox').inputValue(), /version normale/)
  await modal.getByRole('button', { name: 'Envoyer le signalement' }).click()
  await modal.getByRole('status').filter({ hasText: /enregistré/ }).waitFor()
  assert.equal(reports[0].requestId, reports[1].requestId)
  assert.equal(reports[1].category, 'WRONG_VARIANT')
  assert.equal(reports[1].card.id, card.id)
  assert.equal(reports[1].card.imageUrl, card.imageUrl)
  assert.equal(reports[1].context.openingId, opening.id)
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No mobile overflow')
  await page.setViewportSize({ width: 844, height: 390 })
  await page.goto(`${base}/play`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.locator('.play-surface').waitFor()
  await page.locator('.tbl-leader-zone .play-slot').first().click()
  const sheet = page.getByRole('dialog').last()
  await sheet.getByRole('button', { name: 'Signaler un problème', exact: true }).click()
  await sheet.getByRole('textbox').fill('L’effet de cette carte ne fonctionne pas comme attendu.')
  await sheet.getByRole('button', { name: 'Envoyer le signalement' }).click()
  await sheet.getByRole('status').filter({ hasText: /enregistré/ }).waitFor()
  const last = reports.at(-1)
  assert.equal(last.source, 'PLAY')
  assert.equal(last.context.gameId, view.gameId)
  assert.ok(last.card.printingKey && last.card.definitionId && last.card.code)
  assert.ok(last.context.events.every(e => Object.keys(e).every(k => ['type', 'sequence'].includes(k))))
  assert.equal('state' in last.context, false)
  assert.deepEqual(errors, [])
  console.log('PASS: mobile booster card report, complete card data, variant shortcut, recoverable error/idempotent retry, play card report and filtered context (mock APIs; no database writes)')
} finally { await browser.close() }
