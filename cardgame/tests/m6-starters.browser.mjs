import { chromium, request } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// M6 real-browser check of Starter Decks in /play (desktop and phone). Isolated database only.
// DECKS="ST-14,ST-17" selects the decks (default: ST-07, ST-08, ST-12).
const target = new URL(process.env.DATABASE_URL || 'invalid://')
if (target.hostname !== '127.0.0.1' || target.port !== '55433' || target.pathname !== '/op_play_test') throw Error('Isolated database required')
const db = new PrismaClient(), baseURL = 'http://localhost:3008', results = [], password = 'M6-Starters-9!'
const out = process.env.EVIDENCE_DIR; fs.mkdirSync(out, { recursive: true })
async function check(name, fn) { try { await fn(); results.push({ name, status: 'PASS' }) } catch (e) { results.push({ name, status: 'FAIL', detail: String(e?.message ?? e).slice(0, 400) }) } console.log(JSON.stringify(results.at(-1))) }
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
try {
  const tag = randomUUID()
  const user = await db.user.create({ data: { name: 'M6 starters', email: `m6-${tag}@example.test`, password: await bcrypt.hash(password, 10), hasStarterDecks: true } })
  const api = await request.newContext({ baseURL }), csrf = await (await api.get('/api/auth/csrf')).json()
  await api.post('/api/auth/callback/credentials', { form: { email: user.email, password, csrfToken: csrf.csrfToken, callbackUrl: baseURL } })
  assert.equal((await api.get('/api/play/games/active')).status(), 200)
  for (const [label, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['phone-landscape', { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }]]) {
    const context = await browser.newContext({ storageState: await api.storageState(), locale: 'fr-FR', ...opts })
    const page = await context.newPage(), errors = []
    page.on('pageerror', e => errors.push(String(e))); page.on('dialog', d => d.accept())
    const click = async l => { if (opts.hasTouch) await l.first().tap(); else await l.first().click(); await page.waitForTimeout(400) }
    for (const deck of (process.env.DECKS ?? 'ST-07,ST-08,ST-12').split(',')) {
      await check(`${label}: Starter ${deck} starts, reaches the board, renders its cards and can be conceded`, async () => {
        await page.goto(baseURL + '/play'); await page.getByRole('heading', { name: 'Prêt à prendre la mer ?' }).waitFor()
        const button = page.getByRole('button', { name: new RegExp(`Starter ${deck} `) })
        await button.first().waitFor({ timeout: 20000 })
        assert.equal(await button.count(), 1, `${deck} offered`); assert.equal(await button.isEnabled(), true)
        await click(button)
        await page.getByRole('dialog', { name: 'Qui commence ?' }).waitFor({ timeout: 20000 })
        await click(page.getByRole('button', { name: 'Jouer en premier' }))
        await page.getByRole('dialog', { name: 'Votre main de départ' }).waitFor({ timeout: 20000 })
        assert.equal(await page.locator('.play-sheet .play-hand-card').count(), 5)
        await click(page.getByRole('button', { name: 'Garder' }))
        await page.getByRole('button', { name: 'Fin du tour' }).waitFor({ timeout: 20000 })
        await page.waitForTimeout(800)
        assert.ok(await page.locator('section.play-hand .play-hand-card').count() >= 5)
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, 'no horizontal overflow')
        await page.screenshot({ path: `${out}/${label}-${deck}.png` })
        // The phone tutorial coach overlays the header: the concession is driven by DOM clicks (not part of the check).
        const domClick = async l => { await l.first().waitFor(); await l.first().evaluate(el => el.click()); await page.waitForTimeout(400) }
        await domClick(page.getByRole('button', { name: 'Menu de la partie' }))
        await domClick(page.getByRole('button', { name: 'Abandonner la partie' }))
        await domClick(page.getByRole('dialog').getByRole('button', { name: 'Abandonner', exact: true }))
        await page.getByRole('dialog', { name: 'Fin de partie' }).waitFor({ timeout: 20000 })
        assert.deepEqual(errors, [], 'no page error')
      })
    }
    await context.close()
  }
} finally { await browser.close(); await db.$disconnect() }
fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 1) + '\n')
if (results.some(r => r.status !== 'PASS')) process.exitCode = 1
