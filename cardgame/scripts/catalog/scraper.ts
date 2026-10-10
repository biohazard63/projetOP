import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium, type Page } from 'playwright'
import { digest, extensionCodes, identity, setCode, type RawCard } from './core'
import { readJson, writeJson } from './files'

export type DiscoveredSet = { code: string; family: string; label: string; series: string; language: 'fr' | 'en'; url: string }
export function discoverOptions(options: { value: string; label: string }[], language: 'fr' | 'en') {
  return options.filter(o => o.value && !/^all|tout|toutes$/i.test(o.value)).map(o => {
    const code = extensionCodes(o.label)[0] || (/promo|promotion/i.test(o.label) ? 'PROMO' : /other|autre/i.test(o.label) ? 'OTHER' : `SERIES-${o.value.replace(/[^a-z0-9]/gi, '')}`)
    return { code, family: /^([A-Z]+)-\d+$/.exec(code)?.[1] || 'OTHER', label: o.label, series: o.value, language, url: `https://${language}.onepiece-cardgame.com/cardlist/?series=${encodeURIComponent(o.value)}` } as DiscoveredSet
  })
}
export function preferFrench(sets: DiscoveredSet[]) {
  return [...new Set(sets.map(s => s.code))].sort().map(code => sets.find(s => s.code === code && s.language === 'fr') || sets.find(s => s.code === code)!)
}
export async function browser() {
  const chrome = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  const executablePath = await fs.access(chrome).then(() => chrome, () => undefined)
  return chromium.launch({ headless: true, executablePath })
}
export async function readOptions(page: Page, language: 'fr' | 'en') {
  const options = await page.locator('select#series option').evaluateAll(nodes => nodes.map(n => ({ value: (n as HTMLOptionElement).value, label: n.textContent?.trim() || '' })))
  return discoverOptions(options, language)
}
// Keeps the existing modal layout, bilingual labels and reprint product context.
export async function extractCards(page: Page): Promise<RawCard[]> {
  // tsx/esbuild preserves function names using this helper; Playwright serializes only the callback.
  await page.evaluate('globalThis.__name ||= (fn) => fn')
  return page.evaluate(() => {
    const norm = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim()
    return [...document.querySelectorAll('dl.modalCol')].map(dl => {
      const id = dl.id; const spans = [...dl.querySelectorAll('.infoCol span')].map(s => norm(s.textContent))
      const back = dl.querySelector('.backCol')
      const get = (selector: string, headers: string[]) => {
        const el = [...(back?.querySelectorAll(selector) || [])].find(n => headers.some(h => norm(n.querySelector('h3')?.textContent).toLowerCase() === h.toLowerCase()))
        if (!el) return ''; const clone = el.cloneNode(true) as Element; clone.querySelector('h3')?.remove(); return norm(clone.textContent)
      }
      const a = [...document.querySelectorAll('a.modalOpen')].find(n => n.getAttribute('data-src') === `#${id}`)
      const img = a?.querySelector('img') || dl.querySelector('img')
      const src = img?.getAttribute('data-src') || img?.getAttribute('src') || ''
      const extension = get('.getInfo', ['Extension', 'Card Set(s)']) || norm(back?.querySelector('.getInfo')?.textContent)
      return { id, code: spans[0] || '', rarity: spans[1] || '', type: spans[2] || '', name: norm(dl.querySelector('.cardName')?.textContent),
        cost: get('.cost', ['Coût', 'Cost']), life: get('.cost, .life', ['Vie', 'Life']), attribute: norm(back?.querySelector('.attribute i')?.textContent) || get('.attribute', ['Attribut', 'Attribute']),
        power: get('.power', ['Puissance', 'Power']), counter: get('.counter', ['Contre', 'Counter']), color: get('.color', ['Couleur', 'Color']),
        types: get('.feature', ['Type', 'Types']), effect: get('.text', ['Effet', 'Effect', 'Card Text']), trigger: get('.trigger', ['Déclenchement', 'Trigger']),
        block: get('.block', ['Numéro de bloc', 'Block Number']), extension, image: src ? new URL(src, location.href).href : '', url: `${location.href}#${id}` }
    })
  })
}
export class Throttle {
  private next = 0
  constructor(readonly delay = 1500) { if (!Number.isFinite(delay) || delay < 1000) throw new Error('Délai minimal : 1000 ms') }
  async wait() { const now = Date.now(); const at = Math.max(now, this.next); this.next = at + this.delay; await new Promise(resolve => setTimeout(resolve, at - now)) }
}
export async function limitedRetry<T>(operation: () => Promise<T>, throttle: Throttle, retries = 2): Promise<T> {
  if (!Number.isInteger(retries) || retries < 0 || retries > 3) throw new Error('Nombre de tentatives supplémentaires : 0 à 3')
  for (let attempt = 0; ; attempt++) {
    await throttle.wait()
    try { return await operation() } catch (e) {
      const rateDelay = (e as { retryAfterMs?: number })?.retryAfterMs || 0
      if (attempt >= retries || /HTTP (400|401|403|404)/.test(String(e)) || rateDelay > 60000) throw e
      await new Promise(resolve => setTimeout(resolve, Math.max(rateDelay, 1000 * 2 ** attempt)))
    }
  }
}
export function httpFailure(status: number, retryAfter?: string | null) {
  const error = new Error(`HTTP ${status}`) as Error & { retryAfterMs?: number }
  if (status === 429 || status === 503) {
    const seconds = Number(retryAfter)
    error.retryAfterMs = retryAfter ? Number.isFinite(seconds) ? seconds * 1000 : Math.max(0, Date.parse(retryAfter) - Date.now()) : 5000
  }
  return error
}
const validImage = (b: Buffer) => b.length > 12 && (b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || b.subarray(0, 3).equals(Buffer.from([255,216,255])) || (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP'))
export function imageFilename(card: RawCard, edition: string) {
  const id = identity(card); const url = new URL(String(card.image)); const ext = /\.(png|webp|jpe?g)$/i.exec(url.pathname)?.[0].toLowerCase() || '.img'
  return `${setCode(edition)}--${id.number}--${id.artToken.replace(/[^a-zA-Z0-9_-]/g, '_')}--${digest(url.href).slice(0, 10)}${ext}`
}
export async function downloadResumable(url: string, dest: string, throttle: Throttle, retries = 2) {
  await fs.mkdir(path.dirname(dest), { recursive: true })
  const metaFile = `${dest}.download.json`; const meta = await readJson<{ url: string; checksum?: string } | null>(metaFile, null)
  if (meta?.url === url && meta.checksum) {
    const existing = await fs.readFile(dest).catch(() => null)
    if (existing && validImage(existing) && digest(existing.toString('base64')) === meta.checksum) return 'cached'
  }
  if (await fs.access(dest).then(() => true, () => false)) throw new Error('Existing illustration not verified against download metadata: preserved, manual review required')
  const part = `${dest}.part`
  if (meta?.url !== url) { await fs.writeFile(part, Buffer.alloc(0)); await writeJson(metaFile, { url }) }
  await limitedRetry(async () => {
    const offset = (await fs.stat(part).catch(() => ({ size: 0 }))).size
    const res = await fetch(url, { signal: AbortSignal.timeout(30000), headers: offset ? { Range: `bytes=${offset}-` } : {} })
    if (!res.ok) throw httpFailure(res.status, res.headers.get('retry-after'))
    if (res.status === 206 && !res.headers.get('content-range')?.startsWith(`bytes ${offset}-`)) throw new Error('Invalid resume range')
    if (res.status !== 206) await fs.writeFile(part, Buffer.alloc(0))
    if (!res.body) throw new Error('Empty image body')
    const file = await fs.open(part, 'a'); let total = res.status === 206 ? offset : 0
    const reader = res.body.getReader()
    try { while (true) { const { value: chunk, done } = await reader.read(); if (done) break; total += chunk.length; if (total > 10 * 1024 * 1024) throw new Error('Image larger than 10 MiB'); await file.write(chunk) } } finally { reader.releaseLock(); await file.close() }
    const buf = await fs.readFile(part)
    if (!validImage(buf)) { await fs.writeFile(part, Buffer.alloc(0)); throw new Error('Invalid image signature') }
    await fs.rename(part, dest); await writeJson(metaFile, { url, checksum: digest(buf.toString('base64')) })
  }, throttle, retries)
  return 'downloaded'
}
