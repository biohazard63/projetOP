import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { config } from 'dotenv'
import { encode } from 'next-auth/jwt'
config({ path: '.env', quiet: true })

const base = process.env.UI_BASE_URL || 'http://localhost:3000'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local target required')
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const cookieName = 'next-auth.session-token'
  const token = await encode({ secret: process.env.NEXTAUTH_SECRET, salt: cookieName, token: { id: 'reopen-fixture', name: 'Test local', email: 'fixture@example.test' } })
  await page.context().addCookies([{ name: cookieName, value: token, url: base, httpOnly: true, sameSite: 'Lax' }])
  const calls = []
  const card = { id: 'fixture', code: 'OP01-001', name: 'Carte de test', rarity: 'C', type: 'CHARACTER', color: 'RED', imageUrl: '/images/card-back.jpg', cost: 1, power: 1000, counter: null, isNew: true, quantityBefore: 0 }
  const opening = i => ({ id: `fixture-${i}`, setCode: 'OP-01', setName: 'Test local', cards: [card], openedAt: new Date().toISOString() })
  await page.addInitScript(() => localStorage.setItem('mugiwara:display:reopen-fixture', JSON.stringify({ quickOpening: true, animations: false })))
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    let data = {}
    if (path === '/api/auth/session') data = { user: { id: 'reopen-fixture', name: 'Test local', email: 'fixture@example.test' }, expires: '2099-01-01' }
    else if (path === '/api/berries') data = { balance: 1000000, economy: { prices: { booster: 1000, display: 20000 }, events: [] } }
    else if (path === '/api/booster') data = { sets: [{ code: 'OP-01', name: 'Test local', available: true, cardCount: 1, packSize: 1 }] }
    else if (path === '/api/booster/history') data = { openings: [], nextCursor: null }
    else if (path === '/api/booster/open') { calls.push(1); data = { opening: opening(calls.length) } }
    else if (path === '/api/booster/open-batch') { const { count } = route.request().postDataJSON(); calls.push(count); data = { openings: Array.from({ length: count }, (_, i) => opening(`${calls.length}-${i}`)) } }
    await route.fulfill({ json: data })
  })
  await page.goto(`${base}/booster-opening?set=OP-01`)
  await page.getByRole('button', { name: /Ouvrir le booster/ }).first().click({ timeout: 10000 })
  const choices = page.getByRole('radiogroup', { name: 'Nombre de boosters à rouvrir' })
  await choices.waitFor()
  await choices.getByRole('radio', { name: '×5', exact: true }).click()
  const reopen = page.locator('.bo-reopen-controls > button')
  await reopen.click()
  await page.getByRole('button', { name: 'Passer au récapitulatif' }).click()
  await choices.getByRole('radio', { name: '×10', exact: true }).click()
  await reopen.click()
  await page.getByRole('button', { name: 'Passer au récapitulatif' }).click()
  await choices.getByRole('radio', { name: 'Display de 24 boosters' }).click()
  assert.match(await reopen.innerText(), /20\s?000/)
  await reopen.click()
  await page.getByRole('button', { name: 'Passer au récapitulatif' }).click()
  await choices.getByRole('radio', { name: '×1', exact: true }).click()
  await reopen.click()
  await choices.waitFor()
  assert.deepEqual(calls, [1, 5, 10, 24, 1])
  await reopen.scrollIntoViewIfNeeded()
  const buttonBox = await reopen.boundingBox()
  const navBox = await page.locator('.piece-bottom-nav').boundingBox()
  assert.ok(buttonBox.y + buttonBox.height <= navBox.y, 'Reopen button above navigation')
  assert.equal(await reopen.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) }), true)
  console.log('PASS: reopen 1 → 5 → 10 → 24 → 1, display price, mobile button clickable above navigation (mock APIs; no database writes)')
} finally { await browser.close() }
