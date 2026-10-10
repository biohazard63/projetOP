import path from 'node:path'
import { browser, downloadResumable, extractCards, httpFailure, imageFilename, limitedRetry, preferFrench, readOptions, Throttle, type DiscoveredSet } from './scraper'
import { buildFiles, MASTER, readJson, ROOT, writeJson } from './files'
import { identity, setCode, type Catalog, type RawCard } from './core'

const args = process.argv.slice(2)
const flag = (name: string) => args.includes(name)
const value = (name: string) => { const inline = args.find(a => a.startsWith(`${name}=`)); if (inline) return inline.slice(name.length + 1); const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1] }
async function main() {
  if (flag('--help')) { console.log('node scripts/scrape-onepiece-fr.js --list-sets | --sync-new | --set OP-01,EB-01 [--update-existing] [--dry-run] [--fixture FILE] [--authorized-source] [--delay 1500] [--retries 2]\nSans autorisation explicite de la source : fichiers locaux uniquement. --all/--all-sets et --lang=en conservés.'); return }
  const catalog = await readJson<Catalog | null>(MASTER, null)
  const fixtureFile = value('--fixture')
  const fixture = fixtureFile ? await readJson<{ sets: DiscoveredSet[]; cards: Record<string, RawCard[]> }>(fixtureFile) : null
  const throttle = new Throttle(Number(value('--delay') || 1500)); const retries = Number(value('--retries') || 2)
  if (!Number.isInteger(retries) || retries < 0 || retries > 3) throw new Error('--retries doit être compris entre 0 et 3')
  let sets: DiscoveredSet[] = fixture?.sets || (catalog?.extensions || []).map(e => ({ code: e.code, family: e.family, label: e.name.fr || e.name.original, series: '', language: 'fr', url: '' }))
  let b: Awaited<ReturnType<typeof browser>> | undefined
  const errors: { code: string; stage: string; error: string }[] = []
  const saved: { code: string; cards: number; added: number; images: number }[] = []
  const authorized = flag('--authorized-source')
  try {
    if (authorized && !fixture) {
      b = await browser(); const page = await b.newPage()
      // HTML only: block images, fonts, analytics and media. Never bypass access restrictions.
      await page.route('**/*', route => route.request().resourceType() === 'document' && /https:\/\/(fr|en)\.onepiece-cardgame\.com\//.test(route.request().url()) ? route.continue() : route.abort())
      sets = []
      for (const language of flag('--en') || value('--lang') === 'en' ? ['en'] as const : ['fr', 'en'] as const) {
        const origin = `https://${language}.onepiece-cardgame.com`
        const robots = await limitedRetry(() => fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(30000) }), throttle, retries)
        if (robots.status !== 404 && !robots.ok) throw new Error(`robots.txt HTTP ${robots.status} : collecte bloquée`)
        const policy = robots.ok ? await robots.text() : ''
        // Conservative: any disallowed cardlist/root path blocks collection, rather than ignoring a bot-specific rule.
        if (/Disallow:\s*\/(?:cardlist[^\r\n]*|\s*(?:\r?\n|$))/i.test(policy)) throw new Error('robots.txt interdit ce chemin : collecte bloquée')
        await limitedRetry(async () => { const response = await page.goto(`${origin}/cardlist/`, { waitUntil: 'domcontentloaded', timeout: 30000 }); if (!response?.ok()) throw httpFailure(response?.status() || 0, response?.headers()['retry-after']) }, throttle, retries)
        sets.push(...await readOptions(page, language))
      }
      await page.close()
    }
    sets = preferFrench(sets)
    const codes = value('--set')?.split(',').map(s => setCode(s.trim())).filter(Boolean) || []
    if (flag('--list-sets')) { console.log(JSON.stringify({ source: fixture ? 'fixture' : authorized ? 'official-authorized' : 'historical-local', sets }, null, 2)); return }
    if (!codes.length && !flag('--sync-new') && !flag('--update-existing') && !flag('--all') && !flag('--all-sets')) throw new Error('Choisir --set, --sync-new, --update-existing ou --all ; aucune collecte globale implicite.')
    if (!authorized && !fixture) throw new Error('Collecte distante bloquée : le site officiel exige une autorisation de reproduction. Utiliser --fixture pour les tests ou catalog:sync pour fusionner les archives. --authorized-source est réservé à une autorisation réellement obtenue.')
    for (const code of codes) if (!sets.some(s => s.code === code)) throw new Error(`Extension non détectée : ${code}`)
    const targets = sets.filter(s => (!codes.length || codes.includes(s.code)) && (!flag('--sync-new') || flag('--update-existing') || !catalog?.extensions.some(e => e.code === s.code)))
    for (const set of targets) {
      try {
        let cards = fixture?.cards[set.code]
        if (!cards && b) {
          const page = await b.newPage()
          try {
            await page.route('**/*', route => route.request().resourceType() === 'document' && new URL(route.request().url()).hostname === new URL(set.url).hostname ? route.continue() : route.abort())
            await limitedRetry(async () => { const response = await page.goto(set.url, { waitUntil: 'domcontentloaded', timeout: 30000 }); if (!response?.ok()) throw httpFailure(response?.status() || 0, response?.headers()['retry-after']) }, throttle, retries)
            cards = await extractCards(page)
            if (!cards.length) throw new Error('Extension vide ou structure du site modifiée')
            // Current site embeds all modal details. If it switches to server pagination, refuse incomplete output.
            const total = await page.locator('body').innerText().then(t => /([\d\s]+)\s+(?:résultats|results)/i.exec(t)?.[1].replace(/\s/g, ''))
            if (total && Number(total) !== cards.length) throw new Error(`Collecte partielle détectée (${cards.length}/${total}) : ancienne extension conservée`)
          } finally { await page.close() }
        }
        if (!cards?.length) throw new Error('Extension sans cartes')
        const unique = [...new Map(cards.map(c => [identity(c).key, c])).values()]
        const existing = catalog?.variants.filter(v => v.extensions.includes(set.code)).map(v => v.key) || []
        const added = unique.filter(c => !existing.includes(identity(c).key)).length
        if (flag('--dry-run')) { saved.push({ code: set.code, cards: unique.length, added, images: 0 }); continue }
        const out = path.join('out', set.code); const file = path.join(out, `cards-${set.code}.json`)
        const previous = await readJson<RawCard[]>(file, [])
        // Stable number/art within edition; previous variants never removed or downgraded to empty fields.
        const merged = new Map(previous.map(c => [identity(c).key, c])); let images = 0
        for (const c of unique) {
          const key = identity(c).key; const old = merged.get(key) || {}
          const card: RawCard = { ...old, ...Object.fromEntries(Object.entries(c).filter(([, v]) => v !== '' && v !== null && v !== undefined)), sourceLanguage: set.language, setCode: set.code, sourceRights: fixture ? 'test_fixture' : 'operator_authorized' }
          if (card.image && !fixture) {
            const url = new URL(String(card.image)); if (!/^(fr|en)\.onepiece-cardgame\.com$/.test(url.hostname) || url.protocol !== 'https:') throw new Error('Source image non officielle refusée')
            const filename = imageFilename(card, set.code)
            try { await downloadResumable(url.href, path.join('out/images', set.code, filename), throttle, retries); card.image_local = `images/${set.code}/${filename}`; images++ } catch (e) { errors.push({ code: set.code, stage: 'image', error: String(e) }) }
          }
          merged.set(key, card)
        }
        await writeJson(file, [...merged.values()]); saved.push({ code: set.code, cards: merged.size, added, images })
      } catch (e) { errors.push({ code: set.code, stage: 'cards', error: e instanceof Error ? e.message : String(e) }) }
    }
    const report = { dryRun: flag('--dry-run'), detectedSets: sets, selectedSets: targets.map(s => s.code), saved, errors, productionImported: false }
    if (!flag('--dry-run')) { await buildFiles(); await writeJson(path.join(ROOT, 'reports/sync-report.json'), report) }
    console.log(JSON.stringify(report, null, 2)); if (errors.length) process.exitCode = 1
  } finally { await b?.close() }
}
main().catch(e => { console.error(e instanceof Error ? e.message : 'Collecte interrompue'); process.exitCode = 1 })
