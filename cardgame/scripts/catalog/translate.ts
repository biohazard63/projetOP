import { memoryKey, TEXT_FIELDS, translationSafety, type Catalog, type Memory, type TextField } from './core'

/** Reuse known French text for the same official card number. Rule text is provisional,
 * requires an unambiguous French counterpart and a numeric/symbol guard. Never invent rules.
 * Human-reviewed memory remains the only source of a `validated` status.
 */
export function prepareTranslationMemory(catalog: Catalog, previous: Memory): Memory {
  const memory = { ...previous }
  const byNumber = new Map<string, typeof catalog.variants>()
  for (const variant of catalog.variants) byNumber.set(variant.number, [...(byNumber.get(variant.number) || []), variant])
  for (const variant of catalog.variants) {
    const related = byNumber.get(variant.number) || []
    for (const field of TEXT_FIELDS) {
      const text = variant.text[field]
      if (text.fr || !text.original) continue
      const alias: TextField = field === 'ability' ? 'effect' : field
      const choices = related.flatMap(v => [v.text[alias]]).filter(t => t.fr && ['official', 'validated'].includes(t.translationStatus))
      const french = [...new Set(choices.map(t => t.fr!))]
      if (french.length !== 1) continue
      if (['effect', 'ability', 'trigger'].includes(field) && !translationSafety(text.original, french[0])) continue
      if (['notes'].includes(field)) continue
      const key = memoryKey(field, text.original)
      if (!memory[key]) memory[key] = { field, original: text.original, fr: french[0], status: 'machine', source: `same-card-french-reference:${variant.number}:requires-review` }
    }
  }
  return memory
}

export async function translateWithLocalService(catalog: Catalog, memory: Memory, endpoint: string, limit = 50, request: typeof fetch = fetch) {
  const url = new URL(endpoint)
  if (!['http:', 'https:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Service de traduction distant refusé : configurer un service local explicite.')
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('Limite de traduction : 1 à 1000 textes')
  const jobs = new Map<string, { field: string; original: string }>()
  for (const v of catalog.variants) for (const field of TEXT_FIELDS) {
    const t = v.text[field]; const key = memoryKey(field, t.original)
    if (!t.fr && t.original && !memory[key]) jobs.set(key, { field, original: t.original })
  }
  const result = { memory: { ...memory }, translated: 0, errors: [] as { key: string; reason: string }[] }
  for (const [key, job] of [...jobs].slice(0, limit)) {
    try {
      const response = await request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30000), body: JSON.stringify({ ...job, sourceLanguage: 'en', targetLanguage: 'fr', preserve: ['numbers', 'symbols', 'card references', 'conditions', 'costs'], provisional: true }) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const value = await response.json() as { fr?: unknown }
      if (typeof value.fr !== 'string' || !value.fr.trim() || !translationSafety(job.original, value.fr)) throw new Error('Traduction absente ou nombres/symboles/références altérés')
      result.memory[key] = { ...job, fr: value.fr, status: 'machine', source: 'local-translation-service:requires-review' }; result.translated++
    } catch (e) { result.errors.push({ key, reason: e instanceof Error ? e.message : 'Traduction échouée' }) }
    // Deliberately sequential, no remote quota or paid API invoked.
  }
  return result
}
