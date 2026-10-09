import { chromium, request } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const url = new URL(process.env.DATABASE_URL || '');
if (url.hostname !== '127.0.0.1' || url.port !== '55432' || url.pathname !== '/op_boosters_test') throw new Error('Only isolated op_boosters_test permitted');
const db = new PrismaClient();
const baseURL = 'http://localhost:3007';
const evidence = new URL('../../docs/boosters/evidence/', import.meta.url);
fs.mkdirSync(evidence, { recursive: true });
const results = [];
async function check(name, fn) { try { const detail = await fn(); results.push({ name, status: 'PASS', detail: detail || 'Assertions passed' }); } catch (e) { results.push({ name, status: 'FAIL', detail: e.message }); } console.log(results.at(-1)); }
const alice = await request.newContext({ baseURL });
const bob = await request.newContext({ baseURL });
const anon = await request.newContext({ baseURL });
const password = 'Boosters-Test-9!';
const users = [];
for (const context of [alice, bob]) {
 const email = `booster-browser-${randomUUID()}@example.test`;
 const user = await db.user.create({ data: { email, password: await bcrypt.hash(password, 10), name: 'Booster browser fixture', hasStarterDecks: true } });
 users.push(user);
 const csrf = await (await context.get('/api/auth/csrf')).json();
 const res = await context.post('/api/auth/callback/credentials', { form: { email, password, csrfToken: csrf.csrfToken, callbackUrl: baseURL }, maxRedirects: 0 });
 assert.ok(res.status() < 400, 'Test login failed');
 assert.equal((await (await context.get('/api/auth/session')).json()).user?.id, user.id);
}
const payload = () => ({ setCode: 'OP-TEST', idempotencyKey: randomUUID() });
async function quantity(user = users[0]) { return (await db.userCard.aggregate({ where: { userId: user.id }, _sum: { quantity: true } }))._sum.quantity || 0; }
let first;
await check('Unauthenticated opening, catalog, receipts and history rejected', async () => {
 for (const path of ['/api/booster/open', '/api/booster/generate', '/api/booster', '/api/booster/add-to-collection', '/api/collection/add-cards', '/api/user/collection']) assert.equal((await anon.post(path, { data: payload() })).status(), 401, path);
 for (const path of ['/api/booster', '/api/booster/history', '/api/booster/openings/unknown']) assert.equal((await anon.get(path)).status(), 401, path);
});
await check('Forged cards, identity, probabilities and missing operation keys rejected', async () => {
 for (const extra of [{ cardIds: ['booster-test-OP-TEST-SR-0'] }, { userId: users[1].id }, { slots: [] }, { probability: 1 }]) assert.equal((await alice.post('/api/booster/open', { data: { ...payload(), ...extra } })).status(), 400);
 assert.equal((await alice.post('/api/booster/open', { data: { setCode: 'OP-TEST' } })).status(), 400);
 assert.equal((await alice.post('/api/booster/open', { data: { ...payload(), extra: 'x'.repeat(5000) } })).status(), 400);
 assert.equal((await alice.post('/api/booster/open', { data: '{bad-json', headers: { 'content-type': 'application/json' } })).status(), 400);
 for (const path of ['/api/booster/add-to-collection', '/api/collection/add-cards', '/api/user/collection']) assert.equal((await alice.post(path, { data: { cardIds: ['booster-test-OP-TEST-SR-0'] } })).status(), 400, path);
 assert.equal(await quantity(), 0);
});
await check('Cross-site POST refused without credit', async () => {
 assert.equal((await alice.post('/api/booster/open', { data: payload(), headers: { origin: 'https://untrusted.example' } })).status(), 403);
 assert.equal(await quantity(), 0);
});
await check('Empty, incomplete and nonexistent sets produce explicit errors', async () => {
 for (const [setCode, status] of [['OP-EMPTY', 422], ['OP-INCOMPLETE', 422], ['MISSING', 404]]) assert.equal((await alice.post('/api/booster/open', { data: { ...payload(), setCode } })).status(), status);
 assert.equal(await quantity(), 0);
 const catalog = await (await alice.get('/api/booster')).json();
 assert.equal(catalog.sets.find(s => s.code === 'OP-INCOMPLETE').available, false);
 const rules = await (await alice.get('/api/sets/OP-TEST/rules')).json();
 assert.equal(rules.rules.slots.length, 12);
});
await check('All three API aliases share one receipt and never credit a replay', async () => {
 const body = payload();
 const response = await alice.post('/api/booster/open', { data: body }); assert.equal(response.status(), 201);
 first = (await response.json()).opening; assert.equal(first.cards.length, 12); assert.equal(await quantity(), 12);
 for (const path of ['/api/booster/open', '/api/booster/generate', '/api/booster']) {
  const response = await alice.post(path, { data: body }); assert.equal(response.status(), 200);
  const result = await response.json(); assert.equal(result.replayed, true); assert.deepEqual(result.opening, first);
 }
 for (const path of ['/api/booster/add-to-collection', '/api/collection/add-cards', '/api/user/collection']) assert.equal((await alice.post(path, { data: { openingId: first.id } })).status(), 200);
 assert.equal(await quantity(), 12);
 const counts = new Map(); for (const card of first.cards) counts.set(card.id, (counts.get(card.id) || 0) + 1);
 const collection = await (await alice.get('/api/user/collection')).json();
 for (const [id, count] of counts) assert.equal(collection.cards.find(c => c.id === id)?.quantity, count);
});
await check('Private history, receipt, acknowledgement and cursor ownership', async () => {
 for (const path of [`/api/booster/openings/${first.id}`, `/api/booster/history?cursor=${first.id}`]) assert.equal((await bob.get(path)).status(), 404);
 assert.equal((await bob.post('/api/booster/add-to-collection', { data: { openingId: first.id } })).status(), 404);
 assert.equal((await (await bob.get('/api/booster/history')).json()).openings.length, 0);
 assert.equal((await (await alice.get('/api/booster/history')).json()).openings[0].id, first.id);
 assert.equal((await alice.get('/api/booster/history?cursor=x&unknown=y')).status(), 400);
});
await check('HTTP concurrent replay and distinct operations persist exact quantities', async () => {
 const before = await quantity(); const body = payload();
 const replies = await Promise.all(Array.from({ length: 6 }, () => alice.post('/api/booster/open', { data: body })));
 assert.equal(replies.filter(r => r.status() === 201).length, 1); assert.equal(replies.filter(r => r.status() === 200).length, 5);
 const data = await Promise.all(replies.map(r => r.json())); assert.equal(new Set(data.map(r => r.opening.id)).size, 1);
 const distinct = await Promise.all(Array.from({ length: 4 }, () => alice.post('/api/booster/open', { data: payload() })));
 assert.ok(distinct.every(r => r.status() === 201)); assert.equal(await quantity(), before + 60);
});
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext({ storageState: await alice.storageState(), viewport: { width: 1440, height: 1100 } });
const page = await context.newPage(); const jsErrors = []; const posts = [];
page.on('pageerror', e => jsErrors.push(e.message));
page.on('request', req => { if (req.url().endsWith('/api/booster/open') && req.method() === 'POST') posts.push(JSON.parse(req.postData())); });
async function ready() { await page.goto(baseURL + '/booster-opening'); await page.locator('#booster-set').selectOption('OP-TEST'); await page.getByRole('button', { name: 'Ouvrir le booster', exact: true }).waitFor(); }
await check('Desktop double click, animation and reveal never repeat the attribution', async () => {
 await ready(); const before = await quantity(); const sent = posts.length;
 await page.getByRole('button', { name: 'Ouvrir le booster', exact: true }).evaluate(button => { button.click(); button.click(); });
 await page.getByTestId('collection-confirmation').waitFor(); await page.getByTestId('draw-slot').first().waitFor();
 assert.equal(posts.length - sent, 1); assert.equal(await quantity(), before + 12);
 await page.getByRole('button', { name: 'Carte suivante' }).click(); await page.getByText('1 / 12 cartes révélées', { exact: true }).waitFor();
 await page.getByRole('button', { name: 'Tout révéler' }).click(); await page.getByText('12 / 12 cartes révélées', { exact: true }).waitFor();
 assert.equal(posts.length - sent, 1); assert.equal(await page.getByTestId('draw-slot').count(), 12);
 assert.ok(await page.getByText(/Doublon/).count() > 0);
 await page.evaluate(() => window.scrollTo(0, 0));
 await page.screenshot({ path: new URL('desktop.png', evidence).pathname, fullPage: true });
});
await check('Refresh during pack animation retrieves the receipt and keeps one credit', async () => {
 const before = await quantity(); const sent = posts.length;
 await page.getByRole('button', { name: 'Ouvrir un autre booster', exact: true }).click();
 await page.getByTestId('pack-animation').waitFor(); await page.reload();
 await page.getByTestId('collection-confirmation').waitFor(); await page.getByTestId('draw-slot').first().waitFor();
 assert.equal(posts.length - sent, 1); assert.equal(await quantity(), before + 12);
 await page.getByRole('button', { name: 'Carte suivante' }).click(); await page.reload();
 await page.getByText('1 / 12 cartes révélées', { exact: true }).waitFor();
 assert.equal(posts.length - sent, 1); await page.getByRole('button', { name: 'Tout révéler' }).click();
});
await check('Lost response after server commit retries the same key without a second credit', async () => {
 const before = await quantity(); const sent = posts.length;
 await page.route('**/api/booster/open', async route => {
  const response = await route.fetch(); assert.equal(response.status(), 201);
  await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Réponse perdue après validation serveur' }) });
 }, { times: 1 });
 await page.getByRole('button', { name: 'Ouvrir un autre booster', exact: true }).click();
 await page.getByRole('alert').filter({ hasText: 'Réponse perdue' }).waitFor(); assert.equal(await quantity(), before + 12);
 await page.getByRole('button', { name: 'Réessayer cette ouverture' }).click();
 await page.getByTestId('collection-confirmation').waitFor();
 assert.equal(posts.length - sent, 2); assert.equal(posts[sent].idempotencyKey, posts[sent + 1].idempotencyKey);
 assert.equal(await quantity(), before + 12); await page.getByRole('button', { name: 'Tout révéler' }).click();
});
await check('Mobile and reduced motion, images and card details remain usable', async () => {
 await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
 const before = await quantity(); const sent = posts.length;
 await page.getByRole('button', { name: 'Ouvrir un autre booster', exact: true }).click();
 await page.getByTestId('collection-confirmation').waitFor(); assert.equal(await page.getByTestId('pack-animation').count(), 0, 'Reduced motion should skip the pack animation');
 await page.getByRole('button', { name: 'Tout révéler' }).click();
 await page.getByRole('button', { name: /^Détails de / }).first().click(); await page.getByRole('dialog').waitFor();
 await page.getByRole('button', { name: 'Ajouter aux favoris', exact: true }).click(); await page.getByRole('button', { name: 'Retirer des favoris', exact: true }).waitFor();
 await page.keyboard.press('Escape');
 await page.getByRole('dialog').waitFor({ state: 'hidden' });
 assert.equal(posts.length - sent, 1); assert.equal(await quantity(), before + 12);
 await page.waitForTimeout(300);
 assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow');
 assert.equal(await page.evaluate(() => Array.from(document.images).filter(img => img.complete && img.naturalWidth === 0).length), 0, 'Broken images');
 await page.evaluate(() => window.scrollTo(0, 0));
 await page.screenshot({ path: new URL('mobile.png', evidence).pathname, fullPage: true });
});
await check('Viewing history uses only GET and preserves credited collection quantities', async () => {
 const before = await quantity(); const sent = posts.length;
 await page.getByRole('button', { name: 'Actualiser l’historique' }).click();
 await page.locator('section[aria-labelledby="history-title"] li button').first().click();
 await page.getByText('12 / 12 cartes révélées', { exact: true }).waitFor();
 assert.equal(posts.length, sent); assert.equal(await quantity(), before);
 assert.equal(jsErrors.length, 0, jsErrors.join('; '));
});
await check('History pagination contains only the authenticated owner', async () => {
 for (let n = 0; n < 15; n++) assert.equal((await alice.post('/api/booster/open', { data: payload() })).status(), 201);
 const firstPage = await (await alice.get('/api/booster/history')).json(); assert.equal(firstPage.openings.length, 20); assert.ok(firstPage.nextCursor);
 const secondPage = await (await alice.get(`/api/booster/history?cursor=${firstPage.nextCursor}`)).json(); assert.ok(secondPage.openings.length > 0);
 assert.equal(new Set([...firstPage.openings, ...secondPage.openings].map(row => row.id)).size, firstPage.openings.length + secondPage.openings.length);
 for (const row of [...firstPage.openings, ...secondPage.openings]) assert.equal((await db.boosterOpening.findUniqueOrThrow({ where: { id: row.id } })).userId, users[0].id);
});
await browser.close(); await Promise.all([alice.dispose(), bob.dispose(), anon.dispose(), db.$disconnect()]);
fs.writeFileSync(new URL('browser-results.json', evidence), JSON.stringify({ date: new Date().toISOString(), environment: 'macOS Apple Silicon · Google Chrome · isolated PostgreSQL 16 op_boosters_test', results }, null, 2) + '\n');
if (results.some(result => result.status === 'FAIL')) process.exitCode = 1;
