import { chromium, request } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const target = new URL(process.env.DATABASE_URL || '')
if (target.hostname !== '127.0.0.1' || target.port !== '55432' || target.pathname !== '/op_boosters_test') throw Error('Base isolée requise')
const db = new PrismaClient(), baseURL = 'http://localhost:3011'
const evidence = new URL('../../docs/boosters/evidence/', import.meta.url)
const api = await request.newContext({ baseURL })
let browser
const results = []
try {
 const user = await db.user.findFirst({ where: { email: { startsWith: 'managed-browser-' } }, orderBy: { createdAt: 'desc' } })
 assert.ok(user)
 const opening = await db.boosterOpening.findFirst({ where: { userId: user.id }, orderBy: { openedAt: 'desc' }, include: { booster: true } })
 assert.ok(opening)
 const before = await db.userCard.aggregate({ where: { userId: user.id }, _sum: { quantity: true } })
 const csrf = await (await api.get('/api/auth/csrf')).json()
 await api.post('/api/auth/callback/credentials', { form: { email: user.email, password: 'Managed-Profile-Test-9!', csrfToken: csrf.csrfToken, callbackUrl: baseURL }, maxRedirects: 0 })
 assert.equal((await (await api.get('/api/auth/session')).json()).user?.id, user.id)
 browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
 const context = await browser.newContext({ storageState: await api.storageState(), viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false })
 const page = await context.newPage(), errors = []
 page.on('pageerror', e => errors.push(e.message))
 await page.goto(`${baseURL}/boosters?set=${opening.booster.setCode}`)
 await page.getByTestId('selected-booster-artwork').waitFor()
 await page.getByRole('searchbox', { name: 'Rechercher une extension' }).fill(opening.booster.setCode)
 await page.waitForTimeout(350)
 await page.evaluate(() => window.scrollTo(0, 0))
 assert.ok(await page.locator('.piece-sidebar').isVisible())
 assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
 await page.screenshot({ path: new URL('journey-carousel-desktop.png', evidence).pathname, fullPage: true })
 await page.goto(`${baseURL}/booster-opening?set=${opening.booster.setCode}`)
 await page.getByTestId('opening-settings').waitFor()
 await page.evaluate(({ userId, id, code }) => localStorage.setItem(`op:booster:${userId}`, JSON.stringify({ setCode: code, idempotencyKey: crypto.randomUUID(), openingId: id, revealed: 0 })), { userId: user.id, id: opening.id, code: opening.booster.setCode })
 await page.reload()
 await page.getByTestId('single-card-reveal').waitFor()
 await page.getByRole('button', { name: 'Révéler la carte', exact: true }).click()
 await page.waitForTimeout(600)
 await page.evaluate(() => window.scrollTo(0, 0))
 assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
 await page.screenshot({ path: new URL('journey-reveal-desktop.png', evidence).pathname, fullPage: true })
 assert.deepEqual(await db.userCard.aggregate({ where: { userId: user.id }, _sum: { quantity: true } }), before)
 assert.deepEqual(errors, [])
 results.push({ test: 'Native desktop Chrome: sidebar, carousel, single-card receipt review, no overflow or credit', status: 'PASS' })
 await context.close()
} catch (error) { results.push({ test: 'Desktop browser', status: 'FAIL', detail: error.message }); process.exitCode = 1 }
finally {
 await fs.writeFile(new URL('journey-desktop.json', evidence), JSON.stringify({ isolatedDatabase: true, readOnlyReceiptReview: true, results }, null, 2))
 console.log(JSON.stringify(results, null, 2)); await browser?.close(); await api.dispose(); await db.$disconnect()
}
