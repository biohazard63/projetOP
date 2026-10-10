import type { Prisma } from '@prisma/client'
import { type Catalog, type RawCard, TEXT_FIELDS } from './core'
import { MASTER, ROOT, readJson, writeJson } from './files'
import path from 'node:path'

// Export only: never connects to a database or changes an existing Card identifier.
export async function readiness() {
  const catalog = await readJson<Catalog>(MASTER)
  const snapshot = await readJson<{ cards: RawCard[] }>(path.join(ROOT, 'sources/local-database.json'), { cards: [] })
  const duplicates = await readJson<{ conflicts: { key: string; kind: string }[] }>(path.join(ROOT, 'reports/duplicates.json'))
  const byId = new Map(snapshot.cards.map(c => [String(c.id), c]))
  const records: { variantKey: string; provisional: boolean; memberships: string[]; data: Prisma.CardUncheckedCreateInput }[] = []
  const blocked: { key: string; reasons: string[] }[] = []
  const types: Record<string, string> = { PERSONNAGE: 'CHARACTER', CHARACTER: 'CHARACTER', LEADER: 'LEADER', 'ÉVÉNEMENT': 'EVENT', 'ÉVÉNEMENTS': 'EVENT', EVENT: 'EVENT', LIEU: 'STAGE', STAGE: 'STAGE' }
  const colors: Record<string, string> = { Rouge: 'Red', Vert: 'Green', Bleu: 'Blue', Violet: 'Purple', Noir: 'Black', Jaune: 'Yellow', Red: 'Red', Green: 'Green', Blue: 'Blue', Purple: 'Purple', Black: 'Black', Yellow: 'Yellow' }
  for (const v of catalog.variants) {
    const old = v.legacyIds.map(id => byId.get(id)).find(Boolean)
    const reasons: string[] = []
    for (const field of TEXT_FIELDS) if (v.text[field].original && !v.text[field].fr) reasons.push(`fr_missing:${field}`)
    for (const field of ['name', 'type', 'color', 'rarity'] as const) if (!v.text[field].fr) reasons.push(`required:${field}`)
    const type = types[(v.text.type.fr || '').toUpperCase()]
    const colorParts = (v.text.color.fr || '').split(/[/,;]/).map(s => colors[s.trim()])
    if (!type) reasons.push('unsupported_type')
    if (!colorParts.length || colorParts.some(c => !c)) reasons.push('unsupported_color')
    if (v.cost === null) reasons.push('unknown_required_cost')
    if (duplicates.conflicts.some(c => c.key === v.key && /numeric|invalid/.test(c.kind))) reasons.push('unresolved_numeric_conflict')
    const imageUrl = typeof old?.imageUrl === 'string' ? old.imageUrl : v.images.find(i => i.url && /^https?:\/\//.test(i.url))?.url
    if (!imageUrl) reasons.push('missing_image_reference')
    if (!v.extensions.length) reasons.push('missing_membership')
    if (reasons.length) { blocked.push({ key: v.key, reasons: [...new Set(reasons)] }); continue }
    const text = (f: typeof TEXT_FIELDS[number]) => v.text[f].fr
    const provisional = TEXT_FIELDS.some(f => v.text[f].fr && !['official', 'validated'].includes(v.text[f].translationStatus))
    const data: Prisma.CardUncheckedCreateInput = {
      id: typeof old?.id === 'string' ? old.id : `catalog:${v.key}`, code: v.number,
      name: text('name')!, type, color: colorParts.join('/'), cost: v.cost!, power: v.power,
      counter: v.counter === null ? null : String(v.counter), rarity: v.rarityCode || text('rarity')!,
      imageUrl: imageUrl!, setCode: typeof old?.setCode === 'string' ? old.setCode : null,
      set: typeof old?.set === 'string' ? old.set : null, effect: text('effect'), ability: text('ability'), trigger: text('trigger'),
      attribute: text('attribute'), family: text('traits'), notes: text('notes'),
      isAltArt: v.isAltArt, isParallel: v.isParallel, isSpecial: v.isSpecial,
    }
    records.push({ variantKey: v.key, provisional, memberships: v.extensions, data })
  }
  const report = {
    scope: 'Conversion locale seulement ; aucune attribution, aucune écriture SQL. Images distantes non vérifiées, autorisation de publication à confirmer.',
    variants: catalog.variants.length, distinctNumbers: catalog.cards.length,
    frenchCompleteVariants: catalog.variants.filter(v => TEXT_FIELDS.every(f => !v.text[f].original || !!v.text[f].fr)).length,
    readyVariants: records.length, readyDistinctNumbers: new Set(records.map(r => r.data.code)).size,
    provisionalReadyVariants: records.filter(r => r.provisional).length,
    fullyVerifiedReadyVariants: records.filter(r => !r.provisional).length,
    blockedVariants: blocked.length,
    reasons: Object.fromEntries([...new Set(blocked.flatMap(b => b.reasons))].sort().map(reason => [reason, blocked.filter(b => b.reasons.includes(reason)).length])),
    extensions: catalog.extensions.map(e => ({ code: e.code, variants: e.variants.length, ready: records.filter(r => r.memberships.includes(e.code)).length })),
    blocked,
  }
  await writeJson(path.join(ROOT, 'reports/prisma-cards.json'), records)
  await writeJson(path.join(ROOT, 'reports/readiness.json'), report)
  console.log(JSON.stringify({ ...report, blocked: undefined, extensions: undefined }, null, 2))
  return { records, report }
}
if (process.argv[1]?.endsWith('/readiness.ts')) void readiness().catch(error => { console.error(error); process.exitCode = 1 })
