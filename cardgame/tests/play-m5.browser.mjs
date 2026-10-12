import { chromium, request } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// M5 real-browser test of /play: phone, small phone, tablet and desktop; touch drag, long press, swipe,
// mouse and keyboard; animations, reduced motion, refresh, Counter/Blocker/Trigger, DON!! -X, replacement,
// victory and defeat on screen; privacy of every API response; mobile performance with CPU throttling.
// Requires the ISOLATED database and a production server on it (npm run start -- --port 3007).
// Run: DATABASE_URL=<isolated> node --import tsx tests/play-m5.browser.mjs (tsx loads the TypeScript fixture).
const target = new URL(process.env.DATABASE_URL || 'invalid://')
if (target.hostname !== '127.0.0.1' || target.port !== '55433' || target.pathname !== '/op_play_test') throw Error('Isolated database required')
const db = new PrismaClient(), baseURL = 'http://localhost:3007', password = 'Mobile-Play-M5!'
// EVIDENCE_DIR (relative to docs/game/evidence/) keeps each run's evidence apart; an existing results.json is never overwritten.
const evidence = new URL(`../../docs/game/evidence/${(process.env.EVIDENCE_DIR || 'm5/browser').replace(/\/?$/, '/')}`, import.meta.url); fs.mkdirSync(evidence, { recursive: true })
if (fs.existsSync(new URL('results.json', evidence))) throw Error(`${evidence.pathname}results.json exists: choose a new EVIDENCE_DIR`)
const results = [], seen = { anims: new Set(), controls: new Set() }, perf = {}
const shot = (page, name) => page.screenshot({ path: new URL(`${name}.png`, evidence).pathname })
async function check(name, fn) { const t = Date.now(); try { await fn(); results.push({ name, status: 'PASS', ms: Date.now() - t }) } catch (e) { results.push({ name, status: 'FAIL', detail: String(e?.message ?? e).slice(0, 500) }) } console.log(JSON.stringify(results.at(-1))) }
async function account() {
  const user = await db.user.create({ data: { name: 'M5 fixture', email: `m5-${randomUUID()}@example.test`, password: await bcrypt.hash(password, 10), hasStarterDecks: true } })
  const api = await request.newContext({ baseURL }), csrf = await (await api.get('/api/auth/csrf')).json()
  await api.post('/api/auth/callback/credentials', { form: { email: user.email, password, csrfToken: csrf.csrfToken, callbackUrl: baseURL } })
  assert.equal((await api.get('/api/play/games/active')).status(), 200); return { user, api }
}
const payloads = []
async function open(browser, api, opts) {
  const ctx = await browser.newContext({ storageState: await api.storageState(), locale: 'fr-FR', ...opts })
  const page = await ctx.newPage()
  page.on('response', async r => { if (r.url().includes('/api/play/')) { try { payloads.push({ url: r.url(), cache: r.headers()['cache-control'], body: await r.text() }) } catch {} } })
  await page.addInitScript(() => {
    window.__anims = []; window.__frames = []
    new MutationObserver(list => { for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1) { const el = n.matches?.('.tbl-stage') ? n : n.querySelector?.('.tbl-stage'); if (el) window.__anims.push({ kind: el.getAttribute('data-anim'), t: performance.now() }) } }).observe(document, { childList: true, subtree: true })
    let last = performance.now(); const loop = now => { window.__frames.push(now - last); last = now; if (window.__frames.length < 20000) requestAnimationFrame(loop) }; requestAnimationFrame(loop)
    try { new PerformanceObserver(l => { window.__long = (window.__long ?? 0) + l.getEntries().length }).observe({ type: 'longtask', buffered: true }) } catch {}
  })
  return { ctx, page, cdp: opts.hasTouch ? await ctx.newCDPSession(page) : null }
}
const visible = async l => (await l.count()) > 0 && await l.first().isVisible().catch(() => false)
const center = async l => { const b = await l.boundingBox(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) } }
async function touchDrag(cdp, from, to, steps = 10) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] })
  for (let i = 1; i <= steps; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: Math.round(from.x + (to.x - from.x) * i / steps), y: Math.round(from.y + (to.y - from.y) * i / steps) }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}
async function mouseDrag(page, from, to) { await page.mouse.move(from.x, from.y); await page.mouse.down(); for (let i = 1; i <= 10; i++) await page.mouse.move(from.x + (to.x - from.x) * i / 10, from.y + (to.y - from.y) * i / 10); await page.mouse.up() }
async function settle(page) {
  let last = null, stable = 0
  for (let i = 0; i < 120 && stable < 5; i++) {
    await page.waitForTimeout(110)
    const b = page.locator('.play-board'), now = await b.count() ? `${await b.getAttribute('data-version')}|${(await b.getAttribute('class')).includes('busy')}` : 'none'
    stable = now === last && !now.endsWith('true') ? stable + 1 : 0; last = now
  }
}
const version = async page => Number(await page.locator('.play-board').getAttribute('data-version'))
const button = (page, name) => page.getByRole('button', { name, exact: false })

/** Plays the current game to its end with the screen only (drag or tap), recording which controls were used. */
async function playToEnd(page, cdp, { counter = true, block = true, maxSteps = 1600, refreshAt = null, onMain = null, untilMain = false } = {}) {
  const drag = (a, b) => cdp ? touchDrag(cdp, a, b) : mouseDrag(page, a, b)
  const skipped = new Set(); let refreshed = false, triggers = 0, kaido = 0, replacements = 0, plays = 0, attacks = 0, donDrags = 0
  for (let step = 0; step < maxSteps; step++) {
    if (await visible(page.getByRole('dialog', { name: 'Fin de partie' }))) break
    const v = await version(page).catch(() => 0)
    const coach = page.locator('.tbl-coach')
    if (await visible(coach)) { const next = coach.getByRole('button', { name: /^(Suivant|Terminer)$/ }); if (await visible(next)) { await next.click(); seen.controls.add('tutorial-next'); await settle(page); continue } }
    const dialog = page.locator('[role=dialog]:not(.tbl-coach)')
    if (await visible(dialog)) {
      const title = await dialog.first().getAttribute('aria-label')
      const click = async (name, key) => { await button(page, name).first().click(); seen.controls.add(key); await settle(page) }
      if (title === 'Qui commence ?') { await click('Jouer en premier', 'first'); continue }
      if (title === 'Votre main de départ') { await click('Garder', 'keep'); continue }
      if (title === '[Trigger] révélé') { triggers++; if (triggers === 1) await shot(page, `trigger-${page.viewportSize().width}`); await click('Activer le Trigger', 'trigger'); continue }
      if (title === 'Renvoyer des DON!!') { kaido++; await click('Confirmer', 'don-minus-confirm'); continue }
      if (title === 'Terminer le tour ?') { await click('Terminer le tour', 'end-turn-confirm'); continue }
      if (title?.startsWith('Ordre')) { await click('Ordre affiché', 'order'); await click('Valider', 'choice'); continue }
      if (title?.startsWith('Choisissez') || title === 'Aucune carte éligible') { const picks = dialog.locator('.play-pick'); if (await picks.count()) { await picks.first().click(); seen.controls.add('pick') } await click((await visible(button(page, 'Valider'))) ? 'Valider' : 'Ne rien choisir', 'choice'); continue }
      if (title === 'Personnage à remplacer') { await dialog.locator('.play-pick').first().click(); replacements++; seen.controls.add('replace'); await settle(page); continue }
      if (title === 'Cible de l’attaque') { await dialog.locator('.play-pick').first().click(); seen.controls.add('attack-sheet'); await settle(page); continue }
      if (title?.startsWith('Inspection')) { await page.locator('.play-inspect').click(); await settle(page); continue }
      await page.getByRole('button', { name: 'Fermer', exact: true }).first().click(); await settle(page); continue
    }
    const panel = page.locator('.tbl-decision')
    if (await visible(panel)) {
      const blocked = await covered(page); if (blocked.length) throw new Error(`covered controls: ${blocked.join(' | ')}`); seen.controls.add(`reachable-${page.viewportSize().width}`)
      const blockers = panel.getByRole('button', { name: /^Bloquer avec/ })
      if (block && await blockers.count() && step % 2 === 0) { await blockers.first().click(); seen.controls.add('block'); await settle(page); continue }
      const counters = panel.locator('.tbl-quick .piece-button:not(.secondary)')
      if (counter && await counters.count() && step % 2 === 0) { await counters.first().click(); seen.controls.add('counter'); await settle(page); continue }
      await panel.locator('.piece-button.secondary').first().click(); seen.controls.add('pass'); await settle(page); continue
    }
    if (await visible(button(page, 'Résoudre le combat'))) { await button(page, 'Résoudre le combat').click(); seen.controls.add('resolve'); await settle(page); continue }
    if (await visible(button(page, 'Continuer les dégâts'))) { await button(page, 'Continuer les dégâts').click(); seen.controls.add('continue'); await settle(page); continue }
    if (await visible(button(page, 'Fin du tour'))) {
      if (untilMain) return null
      const blocked = await covered(page); if (blocked.length) throw new Error(`covered controls: ${blocked.join(' | ')}`)
      if (refreshAt && !refreshed && v > refreshAt) {
        const before = await page.evaluate(() => window.__anims.length)
        await page.reload(); await button(page, 'Fin du tour').waitFor({ timeout: 20000 }); await page.waitForTimeout(900)
        assert.equal(await version(page), v, 'the refreshed page resumes the same version')
        assert.equal(await page.evaluate(() => window.__anims.length), 0, 'no animation is replayed after a refresh'); void before
        refreshed = true; seen.controls.add('refresh'); await shot(page, `after-refresh-${page.viewportSize().width}`); continue
      }
      if (onMain) await onMain(page)
      // 1. Kaido-like DON!! -X on the Leader (sheet) when offered.
      const leader = page.locator('.play-side.me .play-slot.leader')
      if (!skipped.has(`k${v}`)) { skipped.add(`k${v}`); await leader.click(); if (await visible(button(page, 'Activer : renvoyer'))) { await button(page, 'Activer : renvoyer').click(); seen.controls.add('don-minus'); await settle(page); continue } if (await visible(page.getByRole('button', { name: 'Fermer', exact: true }))) { await page.getByRole('button', { name: 'Fermer', exact: true }).first().click(); await settle(page) } }
      // 2. Play a card by dragging it up from the hand; a full field falls back to the replacement sheet.
      const hand = page.locator('section.play-hand .play-hand-card.can-act')
      let acted = false
      for (let i = 0; i < await hand.count() && !acted; i++) {
        const id = await hand.nth(i).getAttribute('data-card'); if (skipped.has(`${v}:${id}`)) continue; skipped.add(`${v}:${id}`)
        await hand.nth(i).scrollIntoViewIfNeeded(); const from = await center(hand.nth(i)), to = await center(page.locator('.play-side.me .play-row'))
        await drag(from, to); await settle(page)
        if (await version(page) !== v) { acted = true; plays++; seen.controls.add(cdp ? 'drag-play-touch' : 'drag-play-mouse'); break }
        await hand.nth(i).click(); await page.locator('[role=dialog]:not(.tbl-coach)').first().waitFor()
        if (await visible(button(page, 'en remplaçant'))) { await button(page, 'en remplaçant').first().click(); acted = true; break }
        await page.getByRole('button', { name: 'Fermer', exact: true }).first().click(); await settle(page)
      }
      if (acted) { await settle(page); continue }
      // 3. Give one DON!! by dragging a chip onto the Leader (once per version).
      const chip = page.locator('.tbl-chip.draggable')
      if (await chip.count() && !skipped.has(`d${v}`) && donDrags < 6) { skipped.add(`d${v}`); await drag(await center(chip.first()), await center(leader)); await settle(page); if (await version(page) !== v) { donDrags++; seen.controls.add('drag-don'); continue } }
      // 4. Attack the opposing Leader by dragging an attacker onto it.
      const attacker = page.locator('.play-side.me .play-slot.draggable')
      if (await attacker.count() && !skipped.has(`a${v}`)) { skipped.add(`a${v}`); await drag(await center(attacker.first()), await center(page.locator('.play-side.foe .play-slot.leader'))); await settle(page); if (await version(page) !== v) { attacks++; seen.controls.add(cdp ? 'drag-attack-touch' : 'drag-attack-mouse'); continue } }
      await button(page, 'Fin du tour').click(); seen.controls.add('end-turn'); await settle(page); continue
    }
    await settle(page)
  }
  const result = page.getByRole('dialog', { name: 'Fin de partie' }); await result.waitFor({ timeout: 30000 })
  return { text: await result.innerText(), refreshed, triggers, kaido, replacements, plays, attacks, donDrags }
}
async function startGame(page, deck, level) {
  await page.goto(baseURL + '/play'); await page.getByRole('heading', { name: 'Prêt à prendre la mer ?' }).waitFor()
  await page.getByRole('radio', { name: new RegExp(`^${level}`) }).click()
  await button(page, deck).first().click(); await page.getByRole('dialog', { name: 'Qui commence ?' }).waitFor()
}
// Every dock / battle-panel button must be the element under its own centre (nothing overlaps it).
const covered = page => page.evaluate(() => [...document.querySelectorAll('.play-dock .piece-button, .tbl-decision .piece-button, .play-hand-card')].filter(b => { const r = b.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > innerHeight || r.left < 0 || r.right > innerWidth) return false; const x = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1), y = Math.min(r.top + Math.min(r.height / 2, 20), innerHeight - 1); const hit = document.elementFromPoint(x, y); return !(hit && (hit === b || b.contains(hit) || hit.closest('.play-sheet-backdrop, .play-inspect, .play-result, .tbl-coach, .tbl-stage'))) }).map(b => b.textContent?.slice(0, 30) || b.getAttribute('aria-label')))
const noOverflow = page => page.evaluate(() => { const vw = innerWidth, vh = innerHeight; const out = [...document.querySelectorAll('.play-dock .piece-button, .tbl-top .play-icon')].filter(b => { const r = b.getBoundingClientRect(); return r.right > vw + 1 || r.bottom > vh + 1 || r.left < -1 }); return { overflowX: document.documentElement.scrollWidth > vw + 1, hidden: out.length } })

let browser
try {
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }

  // ---------- A. phone, tutorial, touch gestures, animations, refresh, victory vs easy, performance ----------
  const a = await account(), A = await open(browser, a.api, phone)
  await check('Phone 390x844: the picker offers difficulty, tutorial, decks, collection compatibility and statistics', async () => {
    await A.page.goto(baseURL + '/play'); await A.page.getByRole('heading', { name: 'Prêt à prendre la mer ?' }).waitFor()
    for (const l of ['Facile', 'Normal', 'Difficile']) assert.ok(await visible(A.page.getByRole('radio', { name: new RegExp(`^${l}`) })))
    assert.ok(await visible(A.page.getByLabel('Statistiques de jeu'))); assert.ok(await visible(A.page.getByText(/reconnues par le moteur/)))
    assert.deepEqual(await noOverflow(A.page), { overflowX: false, hidden: 0 }); await shot(A.page, 'phone-01-picker')
  })
  await check('Phone: the tutorial guides the first steps and advances on the confirmed card play', async () => {
    await button(A.page, 'Lancer le tutoriel').click(); await A.page.getByRole('dialog', { name: 'Qui commence ?' }).waitFor()
    await button(A.page, 'Jouer en premier').click(); await A.page.getByRole('dialog', { name: 'Votre main de départ' }).waitFor({ timeout: 20000 }); await button(A.page, 'Garder').click()
    await A.page.locator('.tbl-coach').waitFor(); assert.match(await A.page.locator('.tbl-coach').innerText(), /Leader/); await shot(A.page, 'phone-02-tutorial')
    await A.page.locator('.tbl-coach').getByRole('button', { name: 'Suivant' }).click(); await A.page.locator('.tbl-coach').getByRole('button', { name: 'Suivant' }).click()
    assert.match(await A.page.locator('.tbl-coach').innerText(), /Jouer un Personnage/)
    await button(A.page, 'Fin du tour').waitFor({ timeout: 20000 }); await settle(A.page)
    assert.deepEqual(await noOverflow(A.page), { overflowX: false, hidden: 0 }); await shot(A.page, 'phone-03-board')
  })
  await check('Phone: a long press inspects a card; a swipe scrolls the hand without playing anything', async () => {
    const card = A.page.locator('section.play-hand .play-hand-card').first(), p = await center(card), v = await version(A.page)
    await A.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] }); await A.page.waitForTimeout(650); await A.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await A.page.locator('.play-inspect').waitFor(); await A.page.locator('.play-inspect img').evaluate(img => img.complete && img.naturalWidth > 0 || new Promise(r => { img.onload = r; img.onerror = r; setTimeout(r, 8000) })); assert.ok(await A.page.locator('.play-inspect img').evaluate(img => img.naturalWidth > 0), 'the inspected card image is shown'); await shot(A.page, 'phone-04-inspect'); await A.page.locator('.play-inspect').click(); seen.controls.add('long-press')
    const hand = A.page.locator('section.play-hand'), box = await hand.boundingBox()
    await A.cdp.send('Input.synthesizeScrollGesture', { x: Math.round(box.x + box.width * .8), y: Math.round(box.y + box.height / 2), xDistance: -200, yDistance: 0, gestureSourceType: 'touch', speed: 900 }); await A.page.waitForTimeout(400)
    const scroll = await hand.evaluate(el => ({ left: el.scrollLeft, room: el.scrollWidth - el.clientWidth }))
    assert.ok(scroll.room <= 0 || scroll.left > 0, JSON.stringify(scroll)); assert.equal(await version(A.page), v, 'no command was sent by the swipe'); seen.controls.add('swipe')
  })
  await check('Phone: dragging a card up from the hand plays it, and the tutorial moves on to attacking', async () => {
    let played = false
    for (let turn = 0; turn < 4 && !played; turn++) {
      const card = A.page.locator('section.play-hand .play-hand-card.can-act')
      if (await card.count()) {
        const before = await A.page.locator('.play-side.me .play-row .play-slot').count()
        await touchDrag(A.cdp, await center(card.first()), await center(A.page.locator('.play-side.me .play-row'))); await settle(A.page)
        if (await A.page.locator('.play-side.me .play-row .play-slot').count() === before + 1) { played = true; break }
      }
      await button(A.page, 'Fin du tour').click(); await settle(A.page)
      await playToEnd(A.page, A.cdp, { maxSteps: 40 }).catch(() => null)
    }
    assert.ok(played, 'a touch drag played a card'); seen.controls.add('drag-play-touch')
    await A.page.waitForTimeout(400); assert.match(await A.page.locator('.tbl-coach').innerText(), /Attaquer/); await shot(A.page, 'phone-05-dragged')
  })
  await check('Phone (CPU x4): a whole game against the easy bot ends in a VICTORY on screen, with animations and a refresh', async () => {
    await A.cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    const latencies = []; A.page.on('request', r => { if (r.url().includes('/commands') && r.method() === 'POST') r.__t = Date.now() }); A.page.on('requestfinished', r => { if (r.__t) latencies.push(Date.now() - r.__t) })
    const res = await playToEnd(A.page, A.cdp, { refreshAt: 30 })
    await shot(A.page, 'phone-06-result')
    assert.match(res.text, /Victoire/, `result: ${res.text}`); assert.ok(res.refreshed)
    const anims = await A.page.evaluate(() => window.__anims.map(a => a.kind)); anims.forEach(k => seen.anims.add(k))
    const frames = await A.page.evaluate(() => window.__frames.slice(30)), long = await A.page.evaluate(() => window.__long ?? 0)
    const sorted = [...frames].sort((x, y) => x - y), lat = [...latencies].sort((x, y) => x - y), q = (arr, p) => arr.length ? Math.round(arr[Math.min(arr.length - 1, Math.floor(arr.length * p))]) : null
    Object.assign(perf, { cpuThrottle: 4, viewport: '390x844@3', frames: frames.length, frameP50ms: q(sorted, .5), frameP95ms: q(sorted, .95), framesOver50ms: frames.filter(f => f > 50).length, longTasks: long, commandRoundTripP50ms: q(lat, .5), commandRoundTripP95ms: q(lat, .95), commands: lat.length, plays: res.plays, attacks: res.attacks, donDrags: res.donDrags })
    await A.cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    for (const k of ['draw', 'play', 'attack', 'life', 'turn']) assert.ok(seen.anims.has(k), `animation ${k} shown`)
  })
  await A.ctx.close()

  // ---------- B. small phone, purple deck vs normal bot: DON!! -X, replacement, Counter/Blocker ----------
  const b = await account(), B = await open(browser, b.api, { ...phone, viewport: { width: 360, height: 740 } })
  await check('Small phone 360x740: the board fits, and a purple game against the normal bot reaches its result on screen', async () => {
    await startGame(B.page, 'Kaido — Animal Kingdom Pirates', 'Normal')
    await button(B.page, 'Jouer en premier').click(); await B.page.getByRole('dialog', { name: 'Votre main de départ' }).waitFor({ timeout: 20000 }); await button(B.page, 'Garder').click()
    await button(B.page, 'Fin du tour').waitFor({ timeout: 20000 }); await settle(B.page)
    assert.deepEqual(await noOverflow(B.page), { overflowX: false, hidden: 0 }); await shot(B.page, 'small-01-board')
    const res = await playToEnd(B.page, B.cdp, {})
    assert.match(res.text, /Victoire|Défaite/); await shot(B.page, 'small-02-result')
    perf.smallPhone = { kaido: res.kaido, replacements: res.replacements, plays: res.plays }
  })
  await B.ctx.close()

  // ---------- C. tablet with reduced motion: no animation, game still playable, concede ----------
  const c = await account(), C = await open(browser, c.api, { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
  await check('Tablet 820x1180 with reduced motion: no animation is played and the game stays playable; conceding shows a defeat', async () => {
    await startGame(C.page, 'Luffy — Interséries', 'Difficile')
    await button(C.page, 'Jouer en premier').click(); await C.page.getByRole('dialog', { name: 'Votre main de départ' }).waitFor({ timeout: 20000 }); await button(C.page, 'Garder').click()
    for (let t = 0; t < 3; t++) { await playToEnd(C.page, C.cdp, { untilMain: true }); if (await visible(C.page.getByRole('dialog', { name: 'Fin de partie' }))) break; await button(C.page, 'Fin du tour').click(); await settle(C.page) }
    await playToEnd(C.page, C.cdp, { untilMain: true })
    assert.equal(await C.page.locator('.play-board').getAttribute('data-motion'), 'reduced')
    assert.equal(await C.page.evaluate(() => window.__anims.length), 0, 'no stage animation with reduced motion')
    assert.equal(await C.page.evaluate(() => getComputedStyle(document.querySelector('.play-card')).animationName), 'none')
    await shot(C.page, 'tablet-01-reduced')
    await C.page.getByRole('button', { name: 'Menu de la partie' }).click(); await button(C.page, 'Abandonner la partie').click()
    await C.page.getByRole('dialog', { name: 'Abandonner la partie ?' }).waitFor(); await shot(C.page, 'tablet-02-confirm'); await button(C.page, 'Abandonner').last().click()
    const result = C.page.getByRole('dialog', { name: 'Fin de partie' }); await result.waitFor(); assert.match(await result.innerText(), /Défaite[\s\S]*Abandon/); await shot(C.page, 'tablet-03-defeat')
    seen.controls.add('concede-confirm')
  })
  await C.ctx.close()

  // ---------- D. desktop: mouse drag, keyboard, permanent journal ----------
  const d = await account(), D = await open(browser, d.api, { viewport: { width: 1440, height: 900 } })
  await check('Desktop 1440x900: journal always visible, keyboard opens and closes a card, a mouse game reaches its result', async () => {
    await startGame(D.page, 'Luffy — Équipage', 'Facile')
    await button(D.page, 'Jouer en premier').click(); await D.page.getByRole('dialog', { name: 'Votre main de départ' }).waitFor({ timeout: 20000 }); await button(D.page, 'Garder').click()
    await button(D.page, 'Fin du tour').waitFor({ timeout: 20000 }); await settle(D.page)
    assert.ok(await D.page.locator('.tbl-log').isVisible(), 'journal visible on desktop')
    await D.page.locator('section.play-hand .play-hand-card').first().focus(); await D.page.keyboard.press('Enter')
    await D.page.getByRole('dialog').waitFor(); await D.page.keyboard.press('Escape'); await D.page.getByRole('dialog').waitFor({ state: 'detached' }); seen.controls.add('keyboard')
    await shot(D.page, 'desktop-01-board')
    const res = await playToEnd(D.page, null, {})
    assert.match(res.text, /Victoire|Défaite/); await shot(D.page, 'desktop-02-result')
  })
  await D.ctx.close()

  // ---------- E. phone: a [Trigger] revealed from Life (real game prepared through PlayService, fixed seed) ----------
  const e = await account(), E = await open(browser, e.api, phone)
  await check('Phone: a revealed [Trigger] shows its card and text, and activating it is confirmed by the server', async () => {
    const { prepareTriggerGame } = await import('./play-m5.fixtures.ts'), game = await prepareTriggerGame(db, e.user.id)
    await E.page.goto(baseURL + '/play'); const sheet = E.page.getByRole('dialog', { name: '[Trigger] révélé' }); await sheet.waitFor({ timeout: 20000 })
    assert.equal(await version(E.page), game.version, 'the board resumes the prepared version')
    const text = await sheet.innerText(); assert.match(text, /Trigger/); assert.ok(await sheet.locator('.play-card img').count(), 'the revealed card face is shown to its owner')
    await sheet.locator('.play-card img').first().evaluate(img => img.complete && img.naturalWidth > 0 || new Promise(r => { img.onload = r; img.onerror = r; setTimeout(r, 8000) }))
    await shot(E.page, 'phone-07-trigger')
    await button(E.page, 'Activer le Trigger').click(); await settle(E.page); seen.controls.add('trigger')
    assert.ok(await version(E.page) > game.version, 'the activation was accepted'); assert.equal(await visible(sheet), false)
    perf.triggerFixtureSeed = game.seed
    await playToEnd(E.page, E.cdp, { untilMain: true }) // resolves what the Trigger and the bot turn ask, back to the main phase
    if (!(await visible(E.page.getByRole('dialog', { name: 'Fin de partie' })))) { await E.page.getByRole('button', { name: 'Menu de la partie' }).click(); await button(E.page, 'Abandonner la partie').click(); await button(E.page, 'Abandonner').last().click() }
    await E.page.getByRole('dialog', { name: 'Fin de partie' }).waitFor()
  })
  await E.ctx.close()

  await check('Every /api/play response is no-store and carries no engine state, seed, PRNG or hidden zone', async () => {
    assert.ok(payloads.length > 50)
    for (const p of payloads) { assert.match(p.cache || '', /no-store/, p.url); for (const key of ['"random"', '"seed"', '"instances"', '"zones"', '"registry"', '"catalog"', '"commands"']) assert.equal(p.body.includes(key), false, `${key} in ${p.url}`) }
  })
  await check('Statistics recorded the finished games of each player only, without touching collection or coins', async () => {
    for (const { user } of [a, b, c, d, e]) { const games = await db.engineGame.findMany({ where: { userId: user.id } }); assert.ok(games.length >= 1 && games.every(g => g.status === 'FINISHED')); assert.equal(await db.coinTransaction.count({ where: { userId: user.id } }), 0); assert.equal(await db.userCard.count({ where: { userId: user.id } }), 0) }
    const levels = (await db.engineGame.findMany({ where: { userId: { in: [a.user.id, b.user.id, c.user.id, d.user.id] } }, select: { botLevel: true } })).map(g => g.botLevel)
    for (const l of ['easy', 'normal', 'hard']) assert.ok(levels.includes(l), `a game was played against ${l}`)
  })
} finally {
  await browser?.close(); await db.$disconnect()
  const out = { date: new Date().toISOString(), browser: 'Google Chrome (headless) with device emulation; no Safari, no physical device', results, animationsSeen: [...seen.anims].sort(), controlsUsed: [...seen.controls].sort(), performance: perf }
  fs.writeFileSync(new URL('results.json', evidence), JSON.stringify(out, null, 2) + '\n')
  console.log(JSON.stringify({ pass: results.filter(r => r.status === 'PASS').length, fail: results.filter(r => r.status === 'FAIL').length }))
}
