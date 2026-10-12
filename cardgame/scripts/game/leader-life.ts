import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { observations, readJson, writeJson } from '../catalog/files'
import { identity, type Catalog } from '../catalog/core'
import { resolveLeaderLife } from '../../src/game/cards/leaderLife'

const reportFile = path.resolve('../docs/game/evidence/leader-life.json')
const masterFile = path.resolve('data/onepiece/catalog/master-catalog.json')
type Evidence = { value: number; source: string; language: 'fr' | 'en' | 'local'; field: 'life' | 'cost'; printing?: string; checkedAt?: string; responseSha256?: string }
type Row = { number: string; variants: string[]; legacyIds: string[]; candidates: Evidence[]; evidence: Evidence[]; life: number | null; status: 'verified' | 'missing' | 'ambiguous' }
const numeric = (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : typeof v === 'string' && /^\d+$/.test(v.trim()) ? Number(v.trim()) : null

// Read only explicit Life/Vie fields, never infer rules from card effects or colours.
export function parseOfficialLife(html: string, source: string, language: 'fr' | 'en'): (Evidence & { number: string })[] {
  const result: (Evidence & { number: string })[] = []
  for (const match of html.matchAll(/<dl\s+class="modalCol"\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/dl>/g)) {
    const info = /<div class="infoCol">([\s\S]*?)<\/div>/.exec(match[2])?.[1]
    if (!info || !/<span>\s*LEADER\s*<\/span>/.test(info)) continue
    const number = /<span>\s*((?:OP|EB|ST|PRB)\d{2}-\d{3}|P-\d{3})\s*<\/span>/.exec(info)?.[1]
    const life = /<h3>\s*(?:Vie|Life)\s*<\/h3>\s*(\d+)\s*<\//.exec(match[2])?.[1]
    if (number && life !== undefined) result.push({ number, value: Number(life), field: 'life', source, language, printing: match[1], checkedAt: new Date().toISOString().slice(0, 10), responseSha256: createHash('sha256').update(html).digest('hex') })
  }
  return result
}

export async function auditLeaders(verifyOfficial = false) {
  const master = await readJson<Catalog>(masterFile)
  const leaders = master.variants.filter(v => v.text.type.original.toUpperCase() === 'LEADER')
  const rows: Row[] = [...new Set(leaders.map(v => v.number))].sort().map(number => ({ number, variants: leaders.filter(v => v.number === number).map(v => v.key), legacyIds: [...new Set(leaders.filter(v => v.number === number).flatMap(v => v.legacyIds))], candidates: [], evidence: [], life: null, status: 'missing' }))
  const byNumber = new Map(rows.map(r => [r.number, r]))
  const local = await observations()
  for (const { raw, source } of local.observations) {
    let number: string
    try { number = identity(raw).number } catch { continue }
    const row = byNumber.get(number)
    if (!row || String(raw.type).toUpperCase() !== 'LEADER') continue
    const life = numeric(raw.life)
    const cost = numeric(raw.cost)
    if (life !== null) row.evidence.push({ value: life, source: source.file, language: 'local', field: 'life' })
    if (cost !== null) row.candidates.push({ value: cost, source: source.file, language: 'local', field: 'cost' })
  }
  const prior = await readJson<{ rows: Row[] }>(reportFile, { rows: [] })
  for (const row of rows) row.evidence.push(...(prior.rows.find(r => r.number === row.number)?.evidence || []).filter(e => e.language !== 'local'))
  const errors: { source: string; error: string }[] = []
  if (verifyOfficial) {
    for (const language of (process.argv.includes('--verify-missing') ? [] : ['fr', 'en']) as ('fr' | 'en')[]) {
      if (language === 'en' && rows.every(r => r.evidence.some(e => e.field === 'life'))) break
      const source = `https://${language}.onepiece-cardgame.com/cardlist/?search=true&categories%5B%5D=Leader`
      await new Promise(resolve => setTimeout(resolve, 1500))
      try {
        const response = await fetch(source, { signal: AbortSignal.timeout(30000) })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const facts = parseOfficialLife(await response.text(), source, language)
        if (!facts.length) throw new Error('Aucun champ Vie explicite détecté ; aucune valeur appliquée')
        for (const fact of facts) {
          const row = byNumber.get(fact.number)
          if (row) {
            row.evidence = row.evidence.filter(e => !(e.source === source && e.printing === fact.printing))
            row.evidence.push(fact)
          }
        }
      } catch (e) { errors.push({ source, error: e instanceof Error ? e.message : String(e) }) }
    }
  }
  if (verifyOfficial) for (const row of rows.filter(r => !r.evidence.length)) {
    const source = `https://en.onepiece-cardgame.com/cardlist/?search=true&freewords=${encodeURIComponent(row.number)}`
    await new Promise(resolve => setTimeout(resolve, 1500))
    try {
      const response = await fetch(source, { signal: AbortSignal.timeout(30000) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      row.evidence.push(...parseOfficialLife(await response.text(), source, 'en').filter(f => f.number === row.number))
    } catch (e) { errors.push({ source, error: e instanceof Error ? e.message : String(e) }) }
  }
  for (const row of rows) {
    const resolved = resolveLeaderLife(row.evidence)
    row.status = resolved.status
    row.life = resolved.life
  }
  const report = { schemaVersion: 1, masterSha256: createHash('sha256').update(await fs.readFile(masterFile)).digest('hex'), sourceFiles: local.files.map(f => ({ path: f.path, hash: f.hash, repaired: f.repaired })), localErrors: local.errors, errors, totals: { numbers: rows.length, variants: leaders.length, verifiedNumbers: rows.filter(r => r.status === 'verified').length, verifiedVariants: rows.filter(r => r.status === 'verified').reduce((n, r) => n + r.variants.length, 0), missingNumbers: rows.filter(r => r.status === 'missing').length, ambiguousNumbers: rows.filter(r => r.status === 'ambiguous').length }, rows }
  await writeJson(reportFile, report)
  console.log(JSON.stringify(report.totals))
  return report
}
if (process.argv[1]?.endsWith('/leader-life.ts')) void auditLeaders(process.argv.includes('--verify-official') || process.argv.includes('--verify-missing')).catch(e => { console.error(e.message); process.exitCode = 1 })
