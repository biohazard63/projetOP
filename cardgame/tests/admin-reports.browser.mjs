import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { encode } from 'next-auth/jwt'

// Isolated dev server, synthetic admin, mocked APIs, deliberately unreachable test database.
const root = process.cwd(), isolated = mkdtempSync(path.join(tmpdir(), 'op-admin-reports-'))
for (const file of ['src', 'package.json', 'tsconfig.json', 'next.config.js', 'postcss.config.js', 'tailwind.config.ts', 'next-env.d.ts']) {
  if (existsSync(file)) cpSync(file, path.join(isolated, file), { recursive: true })
}
for (const dir of ['node_modules', 'public', 'data', 'carteJson', 'prisma']) if (existsSync(dir)) symlinkSync(path.join(root, dir), path.join(isolated, dir), 'dir')
const port = 3018, base = `http://127.0.0.1:${port}`, secret = 'local-admin-browser-test-secret-not-for-production'
const server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'dev', isolated, '--hostname', '127.0.0.1', '--port', String(port)], {
  cwd: isolated, env: { ...process.env, NEXTAUTH_SECRET: secret, AUTH_SECRET: secret, NEXTAUTH_URL: base, AUTH_TRUST_HOST: 'true', REPORT_ADMIN_EMAILS: 'admin@example.test', DATABASE_URL: 'postgresql://fixture:fixture@127.0.0.1:1/no_database', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
})
let logs = ''
server.stdout.on('data', chunk => { logs = (logs + chunk).slice(-5000) })
server.stderr.on('data', chunk => { logs = (logs + chunk).slice(-5000) })
let browser, page
try {
  let ready = false
  for (let i = 0; i < 80; i++) {
    if (server.exitCode !== null) throw Error('Isolated server exited')
    try { const r = await fetch(`${base}/api/admin/access`, { signal: AbortSignal.timeout(1500) }); if (r.ok) { ready = true; break } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  assert.ok(ready, 'Isolated server ready')
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const token = await encode({ secret, salt: 'next-auth.session-token', maxAge: 300, token: { id: 'admin-fixture', email: 'admin@example.test', name: 'Admin test' } })
  await page.context().addCookies([{ name: 'next-auth.session-token', value: token, url: base, httpOnly: true, sameSite: 'Lax' }])
  const access = await page.request.get(`${base}/api/admin/access`)
  assert.equal((await access.json()).admin, true, 'Synthetic admin accepted by the real server guard')
  const errors = [], queries = []
  page.on('pageerror', e => { errors.push(e.message); console.error('Browser error:', e.message) })
  const rows = [{ id: 'report-a', source: 'BOOSTER', category: 'WRONG_VARIANT', description: 'Illustration normale annoncée alternative.', status: 'NEW', cardSnapshot: { code: 'ST01-001', name: 'Carte de test', rarity: 'SR', isAltArt: true }, context: { openingId: 'opening-fixture' }, createdAt: new Date().toISOString(), user: { name: 'Joueur test', email: 'player@example.test' } }, { id: 'report-b', source: 'PLAY', category: 'BUG', description: 'Bouton de jeu bloqué.', status: 'IN_PROGRESS', cardSnapshot: null, context: { gameId: 'game-fixture' }, createdAt: new Date().toISOString(), user: { name: 'Second joueur', email: 'second@example.test' } }]
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    let data = {}
    if (url.pathname === '/api/auth/session') data = { user: { id: 'admin-fixture', name: 'Admin test', email: 'admin@example.test' }, expires: '2099-01-01' }
    else if (url.pathname === '/api/berries') data = { balance: 1000000, economy: { events: [], prices: { booster: 1000, display: 20000 } } }
    else if (url.pathname === '/api/admin/access') data = { admin: true }
    else if (url.pathname === '/api/admin/overview') data = { generatedAt: new Date().toISOString(), users: 42, openings: 150, games: 30, activeGames: 3, reports: 2, cards: 1200, sets: 20, decks: 70, berries: 42000000, reportCounts: { NEW: 1, IN_PROGRESS: 1 }, quality: { missingImages: 2, emptySets: 1 }, writesReady: false, economy: { prices: { booster: 1000, display: 20000 }, rewards: { dailyTreasure: 500 } }, recentUsers: [{ id: 'user-fixture', name: 'Joueur test', berries: 1000000, accountLevel: 1, createdAt: new Date().toISOString() }], recentReports: rows, recentOpenings: [], activity: Array.from({ length: 14 }, (_, i) => ({ day: `2026-10-${String(i + 5).padStart(2, '0')}`, users: i, openings: i * 3, games: i % 4 })) }
    else if (url.pathname === '/api/reports') {
      if (route.request().method() === 'PATCH') { const body = route.request().postDataJSON(); const row = rows.find(r => r.id === body.id); assert.ok(row); row.status = body.status; data = { id: row.id, status: row.status } }
      else {
        queries.push(url.search)
        const filtered = rows.filter(r => (!url.searchParams.get('source') || r.source === url.searchParams.get('source')) && (!url.searchParams.get('category') || r.category === url.searchParams.get('category')) && (!url.searchParams.get('q') || JSON.stringify(r).includes(url.searchParams.get('q'))))
        const counts = {}; for (const r of filtered) counts[r.status] = (counts[r.status] ?? 0) + 1
        data = { reports: filtered.filter(r => !url.searchParams.get('status') || r.status === url.searchParams.get('status')), total: filtered.length, counts, nextCursor: null }
      }
    }
    await route.fulfill({ json: data })
  })
  await page.goto(`${base}/admin`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.getByRole('heading', { name: 'Administration', exact: true }).waitFor()
  await page.getByRole('heading', { name: 'Votre application, en un regard.' }).waitFor()
  assert.equal(await page.locator('.admin-kpi').count(), 4)
  await page.getByRole('img', { name: /Nombre de boosters ouverts/ }).waitFor()
  assert.ok(await page.getByRole('link', { name: /Gérer un joueur/ }).isVisible())
  await page.screenshot({ path: path.join(isolated, 'admin-overview-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Overview fits mobile viewport')
  await page.screenshot({ path: path.join(isolated, 'admin-overview-mobile.png'), fullPage: true })
  console.log('PASS: overview KPIs, activity chart, quick actions and mobile layout; screenshots:', isolated)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${base}/admin/reports`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Signalements', exact: true }).waitFor()
  await page.getByRole('table').waitFor()
  console.log('PASS: reports loaded')
  assert.equal(await page.locator('tbody tr').count(), 2)
  assert.match(await page.getByRole('button', { name: /Tous les signalements/ }).innerText(), /2/)
  assert.ok(await page.locator('.piece-sidebar-links').getByRole('link', { name: 'Administration' }).isVisible())
  await page.getByRole('button', { name: /^Nouveau/ }).click()
  await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 1)
  await page.getByLabel('Origine', { exact: true }).selectOption('BOOSTER')
  await page.getByLabel('Carte, joueur ou description', { exact: true }).fill('ST01-001')
  await Promise.all([page.waitForResponse(r => r.url().includes('/api/reports?') && r.url().includes('q=ST01-001')), page.getByRole('search', { name: 'Rechercher un signalement' }).getByRole('button', { name: 'Rechercher', exact: true }).click()])
  await page.getByText('Consulter le signalement', { exact: true }).click()
  assert.ok(await page.getByText('Illustration normale annoncée alternative.', { exact: true }).isVisible())
  await page.getByLabel('Statut du signalement report-a').selectOption('FIXED')
  await page.getByRole('heading', { name: 'Aucun signalement', exact: true }).waitFor()
  await page.getByRole('button', { name: /^Corrigé/ }).click()
  await page.getByRole('table').waitFor()
  assert.equal(await page.getByLabel('Statut du signalement report-a').inputValue(), 'FIXED')
  await page.setViewportSize({ width: 390, height: 844 })
  const mobile = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth, outside: [...document.querySelectorAll('body *')].filter(el => !el.closest('.admin-table-scroll,.piece-sidebar') && el.getBoundingClientRect().right > innerWidth + 1).slice(0, 15).map(el => ({ tag: el.tagName, cls: el.className, width: el.getBoundingClientRect().width, right: el.getBoundingClientRect().right })) }))
  assert.ok(mobile.document <= mobile.width, `No page overflow on mobile: ${JSON.stringify(mobile)}`)
  await page.getByRole('button', { name: 'Ouvrir le menu', exact: true }).click()
  assert.ok(await page.locator('.piece-mobile-menu').getByRole('link', { name: 'Administration' }).isVisible())
  const ordinary = await browser.newPage()
  const ordinaryToken = await encode({ secret, salt: 'next-auth.session-token', maxAge: 300, token: { id: 'ordinary', email: 'player@example.test' } })
  await ordinary.context().addCookies([{ name: 'next-auth.session-token', value: ordinaryToken, url: base, httpOnly: true, sameSite: 'Lax' }])
  assert.equal((await (await ordinary.request.get(`${base}/api/admin/access`)).json()).admin, false)
  assert.equal((await ordinary.request.get(`${base}/api/reports`)).status(), 403)
  await ordinary.goto(`${base}/admin`, { waitUntil: 'domcontentloaded' })
  // Next.js can stream a notFound boundary with HTTP 200: verify content and API permissions.
  assert.equal(await ordinary.getByRole('heading', { name: 'Administration', exact: true }).count(), 0)
  assert.equal(await ordinary.getByRole('table').count(), 0)
  assert.deepEqual(errors, [])
  assert.ok(queries.some(q => q.includes('source=BOOSTER') && q.includes('q=ST01-001')))
  console.log('PASS: isolated admin dashboard, counts, search/filter, details, status update, mobile navigation/overflow and ordinary-user denial; no database writes')
} catch (error) { console.error(logs); if (page) console.error('Test page:', page.url(), (await page.locator('body').innerText().catch(() => '')).slice(0, 1800)); throw error }
finally { if (browser) await browser.close(); server.kill('SIGTERM') }
