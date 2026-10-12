import { chromium, request } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// M4-I5 real-browser test of /play on a phone viewport (Chrome, touch). Requires the ISOLATED database and a
// production server started on it: npm run start -- --port 3007 (DATABASE_URL=…127.0.0.1:55433/op_play_test).
const target = new URL(process.env.DATABASE_URL || 'invalid://')
if (target.hostname !== '127.0.0.1' || target.port !== '55433' || target.pathname !== '/op_play_test') throw Error('Isolated database required')
const db = new PrismaClient(), baseURL = 'http://localhost:3007', results = [], used = new Set()
const evidence = new URL('../../docs/game/evidence/m4/browser/', import.meta.url); fs.mkdirSync(evidence, { recursive: true })
const shot = async (page, name) => page.screenshot({ path: new URL(`${name}.png`, evidence).pathname })
async function check(name, fn) { try { await fn(); results.push({ name, status: 'PASS' }) } catch (e) { results.push({ name, status: 'FAIL', detail: String(e?.message ?? e).slice(0, 400) }) } console.log(results.at(-1)) }
const password = 'Mobile-Play-9!'
async function login(account) {
  const api = await request.newContext({ baseURL }), csrf = await (await api.get('/api/auth/csrf')).json()
  await api.post('/api/auth/callback/credentials', { form: { email: account.email, password, csrfToken: csrf.csrfToken, callbackUrl: baseURL } })
  assert.equal((await api.get('/api/play/games/active')).status(), 200, 'logged in'); return api
}
let browser
const plays = [], replacements = [], inspected = new Set()
let triggers = 0, redGames = 0
try {
  const tag = randomUUID()
  const alice = await db.user.create({ data: { name: 'Play fixture', email: `play-${tag}@example.test`, password: await bcrypt.hash(password, 10), hasStarterDecks: true } })
  const bob = await db.user.create({ data: { name: 'Other fixture', email: `play-other-${tag}@example.test`, password: await bcrypt.hash(password, 10), hasStarterDecks: true } })
  const api = await login(alice), other = await login(bob)
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  const context = await browser.newContext({ storageState: await api.storageState(), viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', locale: 'fr-FR' })
  const page = await context.newPage(), payloads = []
  page.on('response', async r => { if (r.url().includes('/api/play/')) { try { payloads.push({ url: r.url(), status: r.status(), cache: r.headers()['cache-control'], body: await r.text() }) } catch {} } })
  page.on('dialog', d => d.accept())
  const board = page.locator('.play-board')
  // Waits until no command is in flight and the version is stable (auto-advanced phases included).
  async function settle() {
    let last = null, stable = 0
    for (let i = 0; i < 120 && stable < 6; i++) {
      await page.waitForTimeout(120)
      const now = await board.count() ? `${await board.getAttribute('data-version')}|${await board.getAttribute('class')}` : 'none'
      stable = now === last && !now.includes('busy') ? stable + 1 : 0; last = now
    }
  }
  const visible = async locator => (await locator.count()) > 0 && await locator.first().isVisible()
  const tap = async (locator, name) => { used.add(name); await locator.first().tap(); await settle() }
  const button = name => page.getByRole('button', { name, exact: false })

  await check('Deck picker lists the playable reference decks on a phone', async () => {
    await page.goto(baseURL + '/play'); await page.getByRole('heading', { name: 'Prêt à prendre la mer ?' }).waitFor()
    assert.ok(await visible(button('Kaido — Animal Kingdom Pirates'))); assert.ok(await visible(button('Luffy — Interséries')))
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, 'no horizontal overflow')
    await shot(page, '01-deck-picker')
  })
  await check('Starting a game asks who goes first, then shows the opening hand to keep', async () => {
    await tap(button('Kaido — Animal Kingdom Pirates'), 'start')
    await page.getByRole('dialog', { name: 'Qui commence ?' }).waitFor(); await shot(page, '02-first-player')
    await tap(button('Jouer en premier'), 'first')
    await page.getByRole('dialog', { name: 'Votre main de départ' }).waitFor(); assert.equal(await page.locator('.play-sheet .play-hand-card').count(), 5)
    await shot(page, '03-mulligan'); await tap(button('Garder'), 'keep')
    await button('Fin du tour').waitFor({ timeout: 15000 })
  })
  await check('The hand is a horizontal strip that scrolls with a real touch swipe', async () => {
    const hand = page.locator('section.play-hand').first()
    assert.ok(await hand.locator('.play-hand-card').count() >= 5)
    const box = await hand.boundingBox(), cdp = await context.newCDPSession(page)
    await cdp.send('Input.synthesizeScrollGesture', { x: Math.round(box.x + box.width * 0.8), y: Math.round(box.y + box.height / 2), xDistance: -220, yDistance: 0, gestureSourceType: 'touch', speed: 800 })
    await page.waitForTimeout(400)
    const scrolled = await hand.evaluate(el => ({ left: el.scrollLeft, room: el.scrollWidth - el.clientWidth }))
    assert.ok(scrolled.room <= 0 || scrolled.left > 0, `swipe scrolled the hand (${JSON.stringify(scrolled)})`)
    used.add('swipe'); await shot(page, '04-board-turn-1')
  })
  await check('Only hand cards with a legal action are highlighted, and a tap shows the card with its actions', async () => {
    const cards = page.locator('section.play-hand .play-hand-card'), count = await cards.count()
    for (let i = 0; i < count; i++) {
      const highlighted = ((await cards.nth(i).getAttribute('class')) ?? '').includes('can-act')
      await cards.nth(i).tap(); const sheet = page.getByRole('dialog'); await sheet.waitFor()
      assert.equal(await sheet.getByText('Aucune action possible avec cette carte maintenant.').count() === 0, highlighted, `card ${i}: highlight matches available actions`)
      await page.getByRole('button', { name: 'Fermer' }).tap(); await sheet.waitFor({ state: 'detached' })
    }
  })
  let refreshed = false
  // Plays the current game to its end with the touch interface only (no API shortcut).
  async function playToEnd(allowRefresh) {
    for (let step = 0; step < 1500; step++) {
      if (await visible(page.getByRole('dialog', { name: 'Fin de partie' }))) break
      const dialog = page.getByRole('dialog')
      if (await visible(dialog)) {
        const title = await dialog.first().getAttribute('aria-label')
        if (title === '[Trigger] révélé') { if (!triggers++) await shot(page, '09-trigger'); await tap(button('Activer le Trigger'), 'trigger'); continue }
        if (title === 'Terminer le tour ?') { await tap(button('Terminer le tour'), 'end-turn-confirm'); continue }
        if (title === 'Renvoyer des DON!!') { await tap(button('Confirmer'), 'don-minus-confirm'); continue }
        if (title?.startsWith('Ordre')) { await tap(button('Ordre affiché'), 'order'); await tap(button('Valider'), 'choice'); continue }
        if (title?.startsWith('Choisissez') || title === 'Aucune carte éligible') {
          const picks = dialog.locator('.play-pick'); if (await picks.count()) await tap(picks, 'pick')
          await tap((await visible(button('Valider'))) ? button('Valider') : button('Ne rien choisir'), 'choice'); continue
        }
        if (await visible(button('Fermer'))) { await page.getByRole('button', { name: 'Fermer' }).first().tap(); await settle(); continue }
      }
      if (await visible(button('Ne pas bloquer'))) {
        const blocker = page.locator('.play-side.me .play-row .play-slot.can-act')
        if (await blocker.count() && step % 3 === 0) { await blocker.first().tap(); if (await visible(button('Bloquer avec ce Personnage'))) { await tap(button('Bloquer avec ce Personnage'), 'block'); continue } await page.getByRole('button', { name: 'Fermer' }).tap() }
        await tap(button('Ne pas bloquer'), 'pass-block'); continue
      }
      if (await visible(button('Passer'))) {
        const card = page.locator('section.play-hand .play-hand-card.can-act')
        if (await card.count() && step % 2 === 0) {
          await card.first().tap(); await page.getByRole('dialog').waitFor()
          const counter = page.getByRole('button', { name: /^(Counter \+|Jouer le Counter)/ })
          if (await visible(counter)) { await tap(counter, 'counter'); continue }
          await page.getByRole('button', { name: 'Fermer' }).tap()
        }
        await tap(button('Passer'), 'pass-counter'); continue
      }
      if (await visible(button('Résoudre le combat'))) { await tap(button('Résoudre le combat'), 'resolve'); continue }
      if (await visible(button('Continuer les dégâts'))) { await tap(button('Continuer les dégâts'), 'continue'); continue }
      if (await visible(button('Fin du tour'))) {
        if (allowRefresh && !refreshed && Number(await board.getAttribute('data-version')) > 60) {
          const version = await board.getAttribute('data-version'); await page.reload(); await button('Fin du tour').waitFor(); await settle()
          assert.equal(await board.getAttribute('data-version'), version, 'the refreshed page resumes the same game state'); refreshed = true; used.add('refresh'); await shot(page, '06-after-refresh')
        }
        let acted = false
        const version = await board.getAttribute('data-version')
        for (const area of ['section.play-hand .play-hand-card.can-act', '.play-side.me .play-slot.can-act']) {
          const cards = page.locator(area)
          for (let i = 0; i < await cards.count() && !acted; i++) {
            const id = await cards.nth(i).getAttribute('data-card')
            if (inspected.has(`${version}:${id}`)) continue // already opened at this version without a useful action
            inspected.add(`${version}:${id}`)
            await cards.nth(i).tap(); await page.getByRole('dialog').waitFor()
            for (const [name, key] of [[/^Activer : renvoyer 7 DON/, 'kaido'], [/^Jouer \(coût/, 'play-card'], [/^Attaquer$/, 'attack']]) {
              const action = page.getByRole('button', { name })
              if (await visible(action)) {
                const field = await page.locator('.play-side.me .play-row .play-slot').count()
                await action.first().tap(); await settle(); used.add(key)
                const replace = page.getByRole('dialog', { name: 'Personnage à remplacer' })
                if (key === 'play-card' && await visible(replace)) {
                  // Full Character area: the played card replaces a chosen Character (count unchanged).
                  await tap(replace.locator('.play-pick'), 'replace-character'); replacements.push([field, await page.locator('.play-side.me .play-row .play-slot').count()])
                } else if (key === 'play-card') plays.push([field, await page.locator('.play-side.me .play-row .play-slot').count()])
                if (key === 'attack') { const targets = page.getByRole('dialog', { name: 'Cible de l’attaque' }).locator('.play-pick'); await targets.first().waitFor(); await tap(targets.last(), 'attack-target') }
                acted = true; break
              }
            }
            if (!acted && await visible(button('Fermer'))) { await page.getByRole('button', { name: 'Fermer' }).tap(); await settle() }
          }
          if (acted) break
        }
        if (!acted) await tap(button('Fin du tour'), 'end-turn')
        continue
      }
      await settle()
    }
    const result = page.getByRole('dialog', { name: 'Fin de partie' }); await result.waitFor({ timeout: 20000 })
    return result
  }
  await check('A whole game is played from the touch interface until a result is shown, with a refresh in the middle', async () => {
    const result = await playToEnd(true)
    assert.match(await result.innerText(), /Victoire|Défaite/); await shot(page, '07-result')
    assert.ok(refreshed, 'a refresh happened mid-game')
    assert.ok(plays.length >= 3, `cards were played by touch (${plays.length})`)
    for (const [before, after] of plays) assert.equal(after, before + 1, 'a played Character appears on the field')
    for (const [before, after] of replacements) assert.equal(after, before, 'a replacement keeps five Characters')
  })
  await check('A second whole game with the red deck reaches its result; its Life [Trigger] window is answered from the screen', async () => {
    // The server seed is a CSPRNG: Life content is random, so up to three red games are played until a [Trigger] shows.
    for (redGames = 1; redGames <= 3; redGames++) {
      await tap(button('Nouvelle partie'), 'new-game'); await page.getByRole('heading', { name: 'Prêt à prendre la mer ?' }).waitFor()
      await tap(button('Luffy — Interséries'), 'start-red'); await page.getByRole('dialog', { name: 'Qui commence ?' }).waitFor()
      await tap(button('Jouer en premier'), 'first'); await page.getByRole('dialog', { name: 'Votre main de départ' }).waitFor({ timeout: 15000 }); await tap(button('Garder'), 'keep')
      const result = await playToEnd(false)
      assert.match(await result.innerText(), /Victoire|Défaite/); if (redGames === 1) await shot(page, '08-result-red')
      if (triggers > 0) break
    }
    assert.ok(triggers > 0, 'at least one [Trigger] window was shown to the player')
  })
  await check('Every /api/play response is no-store and carries no engine state, seed or PRNG', async () => {
    assert.ok(payloads.length > 20)
    for (const p of payloads) {
      assert.match(p.cache || '', /no-store/, p.url)
      for (const key of ['"random"', '"seed"', '"instances"', '"zones"', '"registry"', '"catalog"', '"commands"']) assert.equal(p.body.includes(key), false, `${key} in ${p.url}`)
    }
  })
  await check('A second game is conceded from the menu and shows a defeat', async () => {
    await tap(button('Nouvelle partie'), 'new-game'); await page.getByRole('heading', { name: 'Prêt à prendre la mer ?' }).waitFor()
    await tap(button('Luffy — Interséries'), 'start-red'); await page.getByRole('dialog', { name: 'Qui commence ?' }).waitFor()
    await tap(button('Jouer en second'), 'second'); await page.getByRole('dialog', { name: 'Votre main de départ' }).waitFor({ timeout: 15000 }); await tap(button('Garder'), 'keep')
    await tap(page.getByRole('button', { name: 'Menu de la partie' }), 'menu'); await tap(button('Abandonner la partie'), 'concede')
    await page.getByRole('dialog', { name: 'Abandonner la partie ?' }).waitFor(); await tap(page.getByRole('button', { name: 'Abandonner', exact: true }), 'concede-confirm') // M5: styled confirmation
    const result = page.getByRole('dialog', { name: 'Fin de partie' }); await result.waitFor()
    assert.match(await result.innerText(), /Défaite[\s\S]*Abandon/); await shot(page, '10-conceded')
  })
  await check('Anonymous and foreign requests are refused', async () => {
    const anonymous = await request.newContext({ baseURL })
    assert.equal((await anonymous.get('/api/play/games/active')).status(), 401)
    assert.equal((await anonymous.post('/api/play/games', { data: { deck: { kind: 'reference', id: 'reference-purple' } } })).status(), 401)
    const game = await db.engineGame.findFirstOrThrow({ where: { userId: alice.id }, orderBy: { createdAt: 'asc' } })
    assert.equal((await other.get(`/api/play/games/${game.id}`)).status(), 404)
    assert.equal((await other.post(`/api/play/games/${game.id}/commands`, { data: { id: 'x', expectedVersion: game.version, intent: { type: 'END_MAIN' } } })).status(), 404)
  })
  await check('Collection, decks and coins of the player were not written by playing', async () => {
    assert.equal(await db.userCard.count({ where: { userId: alice.id } }), 0); assert.equal(await db.coinTransaction.count({ where: { userId: alice.id } }), 0)
    assert.equal(await db.deck.count({ where: { userId: alice.id } }), 0)
    const games = await db.engineGame.findMany({ where: { userId: alice.id } }); assert.equal(games.length, 2 + Math.min(redGames, 3)); assert.ok(games.every(g => g.status === 'FINISHED'))
  })
} finally {
  await browser?.close(); await db.$disconnect()
  const out = { date: new Date().toISOString(), viewport: '390x844 @3x, touch, Chrome headless', results, usedControls: [...used].sort(), redGamesUntilTrigger: redGames, plays: plays.length, replacements: replacements.length }
  fs.writeFileSync(new URL('results.json', evidence), JSON.stringify(out, null, 2) + '\n')
  console.log(JSON.stringify({ pass: results.filter(r => r.status === 'PASS').length, fail: results.filter(r => r.status === 'FAIL').length, used: out.usedControls }))
}
