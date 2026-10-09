import { request, chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const baseURL = process.env.IMAGE_TEST_BASE_URL || 'http://localhost:3000';
if (!['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname)) throw new Error('Local image server required');
const samples = [
 'https://en.onepiece-cardgame.com/images/cardlist/card/OP03-079.png?250820',
 'https://fr.onepiece-cardgame.com/images/cardlist/card/OP09-025.webp?2508202',
];
const imagePath = url => `/_next/image?url=${encodeURIComponent(url)}&w=384&q=75`;
const results = [];
const http = await request.newContext({ baseURL });
let browser;
try {
 for (const url of samples) {
  const response = await http.get(imagePath(url));
  assert.equal(response.status(), 200, new URL(url).hostname);
  assert.match(response.headers()['content-type'], /^image\//);
  results.push({ name: `Official image optimized: ${new URL(url).hostname}`, status: 'PASS' });
 }
 for (const url of ['https://example.org/image.png', 'http://127.0.0.1/private.png']) {
  assert.equal((await http.get(imagePath(url))).status(), 400);
 }
 results.push({ name: 'Unapproved hosts and local network targets refused', status: 'PASS' });
 browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
 const page = await browser.newPage();
 await page.goto(`${baseURL}/login`);
 const loaded = await page.evaluate(paths => Promise.all(paths.map(path => new Promise(resolve => {
  const image = new Image();
  image.onload = () => resolve(image.naturalWidth > 0);
  image.onerror = () => resolve(false);
  image.src = path;
  document.body.appendChild(image);
 }))), samples.map(imagePath));
 assert.deepEqual(loaded, [true, true]);
 results.push({ name: 'English and French artwork rendered by Chrome without CORP blockage', status: 'PASS' });
 console.log(results);
 fs.writeFileSync(new URL('../../docs/boosters/evidence/image-tests.json', import.meta.url), JSON.stringify(results, null, 2) + '\n');
} finally { if (browser) await browser.close(); await http.dispose(); }
