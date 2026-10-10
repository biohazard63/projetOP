import fs from 'node:fs/promises'
import path from 'node:path'
import { digest, identity, rebuild, selectTranslation, TEXT_FIELDS, type Catalog, type Memory, type RawCard, type Source, validateCatalog } from './core'

export const ROOT = path.resolve('data/onepiece')
export const MASTER = path.join(ROOT, 'catalog/master-catalog.json')
export async function readJson<T>(file: string, fallback?: T): Promise<T> {
  try { return JSON.parse(await fs.readFile(file, 'utf8')) as T } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT' && fallback !== undefined) return fallback; throw e }
}
export async function writeJson(file: string, value: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`; await fs.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`); await fs.rename(tmp, file)
}
export async function walk(dir: string): Promise<string[]> {
  try { const entries = await fs.readdir(dir, { withFileTypes: true }); return (await Promise.all(entries.map(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))).flat().sort() }
  catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []; throw e }
}
// Repair invalid JSON tokens only outside strings; originals are never rewritten.
export function parseHistorical(text: string) {
  try { return { value: JSON.parse(text), repaired: false } }
  catch {
    const repaired = text.replace(/"(?:\\.|[^"\\])*"|\bNaN\b|,(?=\s*[}\]])/g, token => token.startsWith('"') ? token : token === 'NaN' ? 'null' : '')
    return { value: JSON.parse(repaired), repaired: true }
  }
}
export async function observations() {
  const paths = [...new Set([
    ...(await walk('carteJson')).filter(p => p.endsWith('.json')),
    ...(await walk('exports')).filter(p => /(?:^|\/)\w*cards[^/]*\.json$/.test(p)),
    ...(await walk('out')).filter(p => /cards[^/]*\.json$/.test(p)),
    'public/cards.json', 'cartes_traduites_fr.json', 'cartes_traduites_complet.json', 'ultra_rare_selected_cards.json',
    ...(await walk('backups')).filter(p => p.endsWith('.json')),
    path.join(ROOT, 'sources/local-database.json'),
  ])].sort()
  const result: { raw: RawCard; source: Source }[] = []; const files: { path: string; records: number; repaired: boolean; hash: string }[] = []; const errors: { file: string; error: string }[] = []
  for (const file of paths) {
    try {
      const text = await fs.readFile(file, 'utf8'); const { value, repaired } = parseHistorical(text)
      const records = Array.isArray(value) ? value : value?.data?.cards || value?.cards
      if (!Array.isArray(records)) { errors.push({ file, error: 'Format non-catalogue : aucun tableau cards' }); continue }
      // Nested user exports live under carteJson/nouvelle/PRODUCT; never classify
      // their cards as an extension named "nouvelle" or split combined products.
      const hint = /^carteJson\/(?:nouvelle\/)?([^/]+)\//.exec(file)?.[1] || /^out\/([^/]+)\/cards-/.exec(file)?.[1]
      const source: Source = { file: path.isAbsolute(file) ? path.relative(process.cwd(), file) : file, setCode: hint, status: /traduit|cards\.fr/.test(file) ? 'review_required' : undefined, language: /traduit|cards\.fr/.test(file) ? 'fr' : undefined }
      for (const raw of records) if (raw && typeof raw === 'object' && !Array.isArray(raw)) result.push({ raw, source })
      files.push({ path: file, records: records.length, repaired, hash: digest(text) })
    } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') errors.push({ file, error: e instanceof Error ? e.message : String(e) }) }
  }
  return { observations: result, files, errors }
}
export async function persistCatalog(catalog: Catalog) {
  const errors = validateCatalog(catalog).filter(e => !e.startsWith('unassigned_variant:'))
  if (errors.length) throw new Error(`Catalogue structurellement invalide : ${errors.slice(0, 5).join(', ')}`)
  // Publish immutable generations first. A crash before the pointer leaves the previous generation usable.
  const revision = digest(JSON.stringify(catalog)).slice(0, 20)
  const generation = path.join(ROOT, 'catalog/generations', revision)
  for (const e of catalog.extensions) {
    const dir = path.join(generation, e.family, e.code)
    await writeJson(path.join(dir, 'cards.json'), catalog.variants.filter(v => v.extensions.includes(e.code)))
    await writeJson(path.join(dir, 'variants.json'), e.variants)
  }
  const orphaned = catalog.variants.filter(v => !v.extensions.length)
  if (orphaned.length) await writeJson(path.join(generation, 'OTHER/UNASSIGNED/cards.json'), orphaned)
  // Rebuild the master from this generation's per-extension files, not a single scrape.
  const perSet = (await walk(generation)).filter(f => f.endsWith('/cards.json'))
  const collected = new Map<string, Catalog['variants'][number]>()
  for (const file of perSet) for (const v of await readJson<Catalog['variants']>(file)) collected.set(v.key, v)
  if (collected.size !== catalog.variants.length) throw new Error('Génération incomplète')
  const master = { ...catalog, variants: [...collected.values()].sort((a, b) => a.key.localeCompare(b.key)) }
  await writeJson(path.join(generation, 'master-catalog.json'), master)
  await writeJson(path.join(generation, 'extensions.json'), catalog.extensions)
  await writeJson(MASTER, master)
  await writeJson(path.join(ROOT, 'catalog/extensions.json'), catalog.extensions)
  await writeJson(path.join(ROOT, 'catalog/current.json'), { schemaVersion: 1, revision, directory: path.relative(path.join(ROOT, 'catalog'), generation) })
  return revision
}
export async function buildFiles() {
  const lockPath = path.join(ROOT, 'catalog/.sync.lock')
  await fs.mkdir(path.dirname(lockPath), { recursive: true })
  const started = Date.now()
  let lock: Awaited<ReturnType<typeof fs.open>>
  while (true) {
    try { lock = await fs.open(lockPath, 'wx'); await lock.writeFile(String(process.pid)); break }
    catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e
      const owner = Number(await fs.readFile(lockPath, 'utf8').catch(() => '0'))
      if (owner > 0) { try { process.kill(owner, 0) } catch (err) { if ((err as NodeJS.ErrnoException).code === 'ESRCH') { await fs.unlink(lockPath).catch(() => {}); continue } } }
      if (Date.now() - started > 30000) throw new Error('Une autre reconstruction est active ; réessayer après sa fin.')
      await new Promise(resolve => setTimeout(resolve, 250))
    }
  }
  try { return await buildFilesLocked() } finally { await lock.close(); await fs.unlink(lockPath) }
}
async function buildFilesLocked() {
  const inputs = await observations(); const memory = await readJson<Memory>(path.join(ROOT, 'translations/translation-memory.json'), {})
  const previous = await readJson<Catalog | null>(MASTER, null)
  const { catalog, conflicts } = rebuild(inputs.observations, memory, previous || undefined)
  const snapshot = await readJson<{ sets?: { id: string; code: string; name: string; description?: string; releaseDate?: string; imageUrl?: string }[] }>(path.join(ROOT, 'sources/local-database.json'), {})
  for (const set of snapshot.sets || []) {
    let extension = catalog.extensions.find(e => e.code === set.code)
    const source = 'data/onepiece/sources/local-database.json'
    const nameCandidate = { original: set.name, language: 'unknown' as const, status: 'review_required' as const, source }
    if (!extension) { extension = { code: set.code, family: /^([A-Z]+)-\d+$/.exec(set.code)?.[1] || 'OTHER', name: selectTranslation('extension', [nameCandidate], memory), variants: [] }; catalog.extensions.push(extension) }
    extension.name = selectTranslation('extension', [...extension.name.originals, nameCandidate], memory)
    const old = extension.metadata
    extension.metadata = { legacyIds: [...new Set([...(old?.legacyIds || []), set.id])], descriptions: selectTranslation('description', [...(old?.descriptions.originals || []), ...(set.description ? [{ original: set.description, language: 'unknown' as const, status: 'review_required' as const, source }] : [])], memory), observedReleaseDates: [...new Set([...(old?.observedReleaseDates || []), ...(set.releaseDate ? [set.releaseDate] : [])])], imageUrls: [...new Set([...(old?.imageUrls || []), ...(set.imageUrl ? [set.imageUrl] : [])])], sources: [...new Set([...(old?.sources || []), source])] }
  }
  catalog.extensions.sort((a, b) => a.code.localeCompare(b.code))
  await persistCatalog(catalog)
  const untranslated: unknown[] = []; const review: unknown[] = []
  const counts = { official: 0, validated: 0, machine: 0, review_required: 0 }
  for (const v of catalog.variants) for (const field of TEXT_FIELDS) {
    const t = v.text[field]; if (!t.original && !t.originals.length) continue
    counts[t.translationStatus]++
    const item = { key: v.key, field, original: t.original, fr: t.fr, status: t.translationStatus }
    if (!t.fr) untranslated.push(item)
    if (!t.fr || t.translationStatus === 'machine' || t.translationStatus === 'review_required') review.push(item)
  }
  for (const e of catalog.extensions) {
    const t = e.name; if (!t.fr) untranslated.push({ key: e.code, field: 'extension', original: t.original })
    if (!t.fr || !['official', 'validated'].includes(t.translationStatus)) review.push({ key: e.code, field: 'extension', original: t.original, fr: t.fr, status: t.translationStatus })
    if (e.metadata?.descriptions.original) {
      const d = e.metadata.descriptions; const item = { key: e.code, field: 'description', original: d.original, fr: d.fr, status: d.translationStatus }
      if (!d.fr) untranslated.push(item)
      if (!d.fr || !['official', 'validated'].includes(d.translationStatus)) review.push(item)
    }
  }
  await writeJson(path.join(ROOT, 'translations/translation-memory.json'), memory)
  await writeJson(path.join(ROOT, 'translations/glossary.json'), (await import('./core')).glossary)
  await writeJson(path.join(ROOT, 'translations/untranslated.json'), untranslated)
  await writeJson(path.join(ROOT, 'translations/review-required.json'), review)
  const byId = new Map<string, Set<string>>(); for (const v of catalog.variants) for (const id of v.legacyIds) { const s = byId.get(id) || new Set<string>(); s.add(v.key); byId.set(id, s) }
  const inventory = { files: inputs.files, fileErrors: inputs.errors, totals: { observations: inputs.observations.length, extensions: catalog.extensions.length, distinctCards: catalog.cards.length, variants: catalog.variants.length, reprintedVariants: catalog.variants.filter(v => v.extensions.length > 1).length, memberships: catalog.variants.reduce((n, v) => n + v.extensions.length, 0), translations: counts, untranslatedFields: untranslated.length, reviewFields: review.length, unassignedVariants: catalog.variants.filter(v => !v.extensions.length).length }, scope: 'Fichiers historiques et snapshot local optionnel ; aucune base de production consultée ; pas de collecte distante.' }
  await writeJson(path.join(ROOT, 'reports/inventory.json'), inventory)
  await writeJson(path.join(ROOT, 'reports/duplicates.json'), { repeatedObservations: inputs.observations.length - catalog.variants.length, conflictingLegacyIds: [...byId].filter(([, keys]) => keys.size > 1).map(([id, keys]) => ({ id, variants: [...keys] })), conflicts })
  await writeJson(path.join(ROOT, 'reports/quarantine.json'), inputs.observations.filter(o => { try { identity(o.raw); return false } catch { return true } }))
  await writeJson(path.join(ROOT, 'reports/extension-classification.json'), catalog.extensions.map(e => ({ code: e.code, family: e.family, classification: /^[A-Z]+-\d+$/.test(e.code) ? 'numbered_historical_product_not_currently_verified_online' : /CARDS-/.test(e.name.original) ? 'legacy_import_artifact_requires_review' : 'legacy_product_alias_requires_review', sources: [...new Set(e.name.originals.map(c => c.source))] })))
  const missing = { unverifiableCompleteness: true, explanation: 'Sans liste officielle autorisée ni liste attendue par extension, les numéros non contigus ne prouvent pas une carte manquante.', incomplete: catalog.variants.filter(v => !v.text.name.fr || !v.images.length || !v.extensions.length).map(v => ({ key: v.key, nameMissing: !v.text.name.fr, imageMissing: !v.images.length, extensionMissing: !v.extensions.length })) }
  await writeJson(path.join(ROOT, 'reports/missing-cards.json'), missing)
  await writeJson(path.join(ROOT, 'reports/validation-report.json'), { errors: validateCatalog(catalog), conflicts: conflicts.length, untranslated: untranslated.length, publishableFrenchOnly: untranslated.length === 0 && conflicts.length === 0, notImported: true })
  return { catalog, inventory, conflicts }
}
export async function auditImages(catalog: Catalog) {
  const localFiles = (await Promise.all(['carteJson', 'public/images', 'out/images', 'images'].map(walk))).flat().filter(p => /\.(png|webp|jpe?g|gif)$/i.test(p))
  const hashes = new Map<string, string[]>(); const byBasename = new Map<string, string[]>()
  for (const f of localFiles) { const h = digest((await fs.readFile(f)).toString('base64')); hashes.set(h, [...(hashes.get(h) || []), f]); byBasename.set(path.basename(f), [...(byBasename.get(path.basename(f)) || []), f]) }
  const missing: unknown[] = []; const overwrittenRisk: unknown[] = []
  const destinations = new Map<string, Set<string>>()
  for (const v of catalog.variants) {
    let found = false
    for (const i of v.images) {
      const possible = [i.localPath, i.localPath ? path.join(path.dirname(i.source), i.localPath) : null, i.localPath ? path.join('out', i.localPath) : null, i.localPath ? path.join('carteJson', i.localPath) : null].filter((p): p is string => !!p)
      for (const p of possible) if (localFiles.includes(p)) found = true
      if (i.localPath) { const keys = destinations.get(i.localPath) || new Set<string>(); keys.add(v.key); destinations.set(i.localPath, keys) }
    }
    if (!found) missing.push({ key: v.key, remoteReferences: v.images.filter(i => i.url).length, reason: 'Aucune illustration locale reliée vérifiable ; références distantes conservées sans téléchargement.' })
  }
  for (const [file, keys] of destinations) if (keys.size > 1) overwrittenRisk.push({ file, variants: [...keys], status: 'historical_collision_not_recoverable_without_authorized_source' })
  const result = { localFiles: localFiles.length, missingCount: missing.length, missing, historicalFilenameCollisions: overwrittenRisk, identicalImages: [...hashes].filter(([, paths]) => paths.length > 1).map(([hash, paths]) => ({ hash, paths })) }
  await writeJson(path.join(ROOT, 'reports/images.json'), result); return result
}
export async function refreshTranslations(catalog: Catalog, memory: Memory) {
  for (const v of catalog.variants) for (const f of TEXT_FIELDS) v.text[f] = selectTranslation(f, v.text[f].originals, memory)
  for (const e of catalog.extensions) e.name = selectTranslation('extension', e.name.originals, memory)
  await persistCatalog(catalog)
}
