import { config } from 'dotenv'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { auditImages, buildFiles, MASTER, readJson, ROOT, writeJson } from './files'
import { assertLocalDatabase, importCatalog, prepareSchema, previewImport, snapshotLocalDatabase } from './database'
import { type Catalog, type Memory, memoryKey, translationSafety, validateCatalog } from './core'
import { prepareTranslationMemory, translateWithLocalService } from './translate'

config({ quiet: true })
const [command = 'audit', ...args] = process.argv.slice(2)
const option = (name: string) => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1] }
async function connection(testOnly = false) {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL absente. Utiliser --files-only pour l’audit sans base.')
  assertLocalDatabase(url, testOnly)
  return new PrismaClient({ datasourceUrl: url })
}
async function main() {
  if (command === 'audit' || command === 'sync') {
    let database: unknown = { status: 'NOT_TESTED', reason: 'Audit fichiers uniquement' }
    if (command === 'audit' && !args.includes('--files-only')) {
      let db: PrismaClient | undefined
      try { db = await connection(); database = { status: 'PASS', ...await snapshotLocalDatabase(db) } }
      catch (e) { database = { status: 'BLOCKED', reason: e instanceof Error && !('code' in e) ? e.message : 'Connexion locale impossible ; aucune donnée modifiée.' } }
      finally { await db?.$disconnect() }
    }
    const result = await buildFiles(); const images = await auditImages(result.catalog)
    if (command === 'audit') await writeJson(path.join(ROOT, 'reports/database-status.json'), database)
    console.log(JSON.stringify({ ...result.inventory.totals, conflicts: result.conflicts.length, missingLocalImages: images.missingCount, database }, null, 2))
    return
  }
  if (command === 'translate') {
    let memory = await readJson<Memory>(path.join(ROOT, 'translations/translation-memory.json'), {})
    const input = option('--memory-file')
    if (input) {
      const incoming = await readJson<Memory>(input)
      const rejected: unknown[] = []
      for (const [key, entry] of Object.entries(incoming)) {
        if (key !== memoryKey(entry.field, entry.original) || !entry.fr || !['official', 'validated', 'machine', 'review_required'].includes(entry.status) || !translationSafety(entry.original, entry.fr)) rejected.push({ key, reason: 'Clé/statut invalide ou nombres, symboles, références modifiés' })
        else {
          const rank = { official: 4, validated: 3, machine: 2, review_required: 1 }
          if (!memory[key] || rank[entry.status] >= rank[memory[key].status]) memory[key] = entry
        }
      }
      await writeJson(path.join(ROOT, 'reports/translation-rejections.json'), rejected)
      if (rejected.length) throw new Error(`${rejected.length} traductions rejetées : aucun changement appliqué.`)
      await writeJson(path.join(ROOT, 'translations/translation-memory.json'), memory)
    }
    memory = prepareTranslationMemory(await readJson<Catalog>(MASTER), memory)
    const endpoint = option('--translation-endpoint')
    if (endpoint) {
      const result = await translateWithLocalService(await readJson<Catalog>(MASTER), memory, endpoint, Number(option('--limit') || 50))
      memory = result.memory
      await writeJson(path.join(ROOT, 'reports/machine-translation-result.json'), { translated: result.translated, errors: result.errors })
    }
    await writeJson(path.join(ROOT, 'translations/translation-memory.json'), memory)
    const result = await buildFiles()
    console.log(JSON.stringify({ translations: result.inventory.totals.translations, missing: result.inventory.totals.untranslatedFields, note: 'Glossaire local et traductions archivées ; aucune traduction externe facturée ni validation humaine inventée.' }, null, 2))
    return
  }
  const catalog = await readJson<Catalog>(MASTER)
  if (command === 'validate') {
    const errors = validateCatalog(catalog)
    await writeJson(path.join(ROOT, 'reports/structural-validation.json'), { status: errors.length ? 'FAIL' : 'PASS', errors })
    console.log(JSON.stringify({ status: errors.length ? 'FAIL' : 'PASS', errors: errors.length, examples: errors.slice(0, 10) }, null, 2))
    if (errors.length) process.exitCode = 1
    return
  }
  if (command === 'import') {
    const apply = args.includes('--apply-test'); const db = await connection(apply)
    try {
      if (apply && args.includes('--prepare-schema')) await prepareSchema(db)
      const preview = await previewImport(db, catalog)
      await writeJson(path.join(ROOT, 'reports/import-preview.json'), preview)
      console.log(JSON.stringify({ created: preview.variantsToCreate.length, updated: preview.variantsToUpdate.length, extensions: preview.extensionsToCreate.length, associations: preview.associationsToAdd.length, conflicts: preview.conflicts.length, missingTranslations: preview.missingTranslations.length, playerRowsAffected: 0, mode: apply ? 'isolated-staging' : 'dry-run' }, null, 2))
      if (apply) {
        const result = await importCatalog(db, catalog)
        await writeJson(path.join(ROOT, 'reports/import-test-result.json'), result)
        console.log(JSON.stringify(result))
      }
    } finally { await db.$disconnect() }
    return
  }
  throw new Error(`Commande inconnue : ${command}`)
}
main().catch(e => { console.error(e instanceof Error && !('code' in e) ? e.message : 'Erreur PostgreSQL : opération interrompue, consulter le rapport local.'); process.exitCode = 1 })
