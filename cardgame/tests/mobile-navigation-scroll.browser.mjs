import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'

const baseURL = process.env.UI_BASE_URL || 'http://127.0.0.1:3000'
if (!['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname)) throw new Error('Local UI target required')
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await page.goto(`${baseURL}/opening-demo`)
  const nav = page.getByRole('navigation', { name: 'Navigation principale mobile', exact: true })
  await nav.waitFor()
  // Horizontal clipping must not turn body into a second vertical scroll container.
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).overflowY), 'visible')
  for (const height of [844, 700, 844]) {
    await page.setViewportSize({ width: 390, height })
    for (const top of [0, 300, 700, 0]) {
      await page.evaluate(y => window.scrollTo(0, y), top)
      await page.waitForTimeout(100)
      const gap = await nav.evaluate(el => window.innerHeight - el.getBoundingClientRect().bottom)
      assert.ok(Math.abs(gap) <= 1, `Bottom gap after scroll/resize: ${gap}`)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow')
    }
  }
  await page.setViewportSize({ width: 1280, height: 800 })
  assert.equal(await nav.isVisible(), false)
  console.log('PASS: mobile navigation anchored during scroll/resize; desktop navigation unchanged')
} finally {
  await browser.close()
}
