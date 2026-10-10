import { createHash } from 'node:crypto'
import { z } from 'zod'

export const TEXT_FIELDS = ['name', 'type', 'color', 'rarity', 'attribute', 'traits', 'effect', 'ability', 'trigger', 'notes'] as const
export type TextField = typeof TEXT_FIELDS[number]
export type Status = 'official' | 'validated' | 'machine' | 'review_required'
export type RawCard = Record<string, unknown>
export type Source = { file: string; language?: 'fr' | 'en'; status?: Status; setCode?: string; rights?: string }
export const digest = (s: string) => createHash('sha256').update(s).digest('hex')
export function stableJson(value: unknown): string {
  const sort = (v: unknown): unknown => Array.isArray(v) ? v.map(sort) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sort(x)])) : v
  return JSON.stringify(sort(value))
}
const str = (s: unknown) => typeof s === 'string' ? s.trim() : typeof s === 'number' && Number.isFinite(s) ? String(s) : ''
export const setCode = (s: string) => s.toUpperCase().replace(/_EN$/, '').replace(/^([A-Z]+)-?(\d+)$/, '$1-$2')
export function extensionCodes(s: string): string[] {
  return [...new Set([...s.matchAll(/\[([A-Z]+-?\d+|PROMO|OTHER)\]/gi)].map(m => setCode(m[1])))]
}
export const glossary: Record<string, string> = {
  Red: 'Rouge', Green: 'Vert', Blue: 'Bleu', Purple: 'Violet', Black: 'Noir', Yellow: 'Jaune',
  CHARACTER: 'PERSONNAGE', Character: 'Personnage', LEADER: 'LEADER', Leader: 'Leader',
  EVENT: 'ÉVÉNEMENT', Event: 'Événement', STAGE: 'LIEU', Stage: 'Lieu',
  Slash: 'Tranchant', Strike: 'Frappe', Ranged: 'Distance', Special: 'Spécial', Wisdom: 'Sagesse',
  C: 'Commune', UC: 'Peu commune', R: 'Rare', SR: 'Super Rare', SEC: 'Secret Rare', L: 'Leader',
  'SP CARD': 'Carte spéciale', P: 'Promotionnelle', TR: 'Rare au trésor',
  '[On Play]': '[Jouée]', '[When Attacking]': '[En attaquant]', '[Blocker]': '[Bloqueur]',
  '[Counter]': '[Contre]', '[Trigger]': '[Déclenchement]', '[Activate: Main]': '[Activation : Principale]',
  Supernovas: 'Supernovas', 'Kid Pirates': 'Équipage de Kid', Animal: 'Animal', 'Straw Hat Crew': 'Équipage de Chapeau de paille',
  'Beautiful Pirates': 'Bel équipage', 'On-Air Pirates': 'Équipage On Air', CP9: 'CP9', CP0: 'CP0', 'East Blue': 'East Blue',
  'Fish-Man': 'Homme-poisson', Merfolk: 'Sirène', 'Whitebeard Pirates': 'Équipage de Barbe Blanche',
  'Impel Down': 'Impel Down', 'Former Baroque Works': 'Ancien Baroque Works', 'Baroque Works': 'Baroque Works',
  Egghead: 'Egg Head', Navy: 'Marine', 'World Government': 'Gouvernement mondial', 'Revolutionary Army': 'Armée révolutionnaire',
  'Donquixote Pirates': 'Équipage de Donquichotte', FILM: 'FILM', 'The Four Emperors': 'Quatre Empereurs',
  'Big Mom Pirates': 'Équipage de Big Mom', 'Seven Warlords of the Sea': 'Sept Grands Corsaires',
  Alabasta: 'Alabasta', Dressrosa: 'Dressrosa', 'Land of Wano': 'Pays de Wano', 'Kouzuki Clan': 'Clan Kozuki',
  'Drum Kingdom': 'Royaume de Drum', 'Water Seven': 'Water Seven', 'Kurozumi Clan': 'Clan Kurozumi',
  'Animal Kingdom Pirates': 'Équipage aux Cent Bêtes', 'The Vinsmoke Family': 'Famille Vinsmoke',
  'Red-Haired Pirates': 'Équipage du Roux', 'The Seven Warlords of the Sea': 'Sept Grands Corsaires',
  'Heart Pirates': 'Équipage du Heart', 'Foxy Pirates': 'Équipage de Foxy', Scientist: 'Scientifique',
  Minks: 'Minks', ODYSSEY: 'ODYSSEY', 'Cross Guild': 'Cross Guild', 'Bonney Pirates': 'Équipage de Bonney',
  'Fish-Man Island': 'Île des Hommes-poissons', 'Punk Hazard': 'Punk Hazard',
  'Kid & Killer': 'Kid et Killer', Cavendish: 'Cavendish', Spandine: 'Spandine', Laboon: 'Laboon', Usopp: 'Usopp',
  'Nico Robin': 'Nico Robin', 'Mr.1(Daz.Bonez)': 'Mr.1(Daz.Bonez)', Marco: 'Marco', 'Charlotte Linlin': 'Charlotte Linlin',
  'Nefeltari Vivi': 'Nefeltari Vivi', 'O-Nami': 'O-Nami', 'Portgas.D.Ace': 'Portgas.D.Ace', Edison: 'Edison',
  'Charlotte Katakuri': 'Charlotte Katakuri', Jack: 'Jack', 'Eustass"Captain"Kid': 'Eustass « Captain » Kid',
  Koala: 'Koala', Carrot: 'Carrot', Ulti: 'Ulti', Adio: 'Adio', Lim: 'Lim', 'Dracule Mihawk': 'Dracule Mihawk',
  Crocodile: 'Crocodile', 'Jewelry Bonney': 'Jewelry Bonney', 'Charlotte Smoothie': 'Charlotte Smoothie',
  Shirahoshi: 'Shirahoshi', Franky: 'Franky', Brook: 'Brook', 'Gum-Gum Jet Pistol': 'Gum-Gum Jet Pistol',
}
export type Candidate = { original: string; language: 'fr' | 'en' | 'unknown'; status: Status; source: string }
export type Translation = { original: string; fr: string | null; translationStatus: Status; source: string | null; originals: Candidate[] }
export type Image = { key: string; url: string | null; localPath: string | null; source: string; language: string; rights: string }
export type Variant = {
  key: string; number: string; artToken: string; legacyIds: string[]; extensions: string[];
  editions: { key: string; code: string; rarityCodes: string[]; sources: string[]; productNames: string[] }[];
  images: Image[]; sources: string[]; text: Record<TextField, Translation>;
  cost: number | null; power: number | null; counter: number | null; life: number | null; block: string | null;
  rarityCode: string | null; isAltArt: boolean; isParallel: boolean; isSpecial: boolean;
}
export type Catalog = { schemaVersion: 1; cards: { number: string; variants: string[] }[]; variants: Variant[]; extensions: { code: string; family: string; name: Translation; variants: string[]; metadata?: { legacyIds: string[]; descriptions: Translation; observedReleaseDates: string[]; imageUrls: string[]; sources: string[] } }[] }
export type Conflict = { kind: string; key: string; field?: string; values?: unknown[]; source?: string }
export type MemoryEntry = { field: string; original: string; fr: string; status: Status; source?: string }
export type Memory = Record<string, MemoryEntry>
export const memoryKey = (field: string, original: string) => digest(`${field}\0${original}`)
export function isEnglish(s: string) { return /\b(your|opponent|Character|When Attacking|On Play|up to|draw|discard|this card|the following|Straw Hat Crew|Land of Wano|Four Emperors)\b/i.test(s) }
export const weakProvenance = (source: string | null) => /local-database\.json|backups\/|cards\.fr\.json|traduites/.test(source || '')
function isFrench(s: string) { return /[àâçéèêëîïôùûüœ]|\b(votre|adversaire|jouée|piochez|défaussez|personnage|jusqu|vous|attaquant)\b/i.test(s) }
function candidates(raw: RawCard, field: TextField, source: Source): Candidate[] {
  const alias = field === 'traits' ? 'types' : field
  const s = str(raw[alias] ?? (field === 'traits' ? raw.family : undefined))
  if (!s || s === '-' || s === '[]') return []
  const url = str(raw.url) || str(raw.image) || str(raw.imageUrl)
  const officialFr = /https:\/\/fr\.onepiece-cardgame\.com\//.test(str(raw.url)) && !weakProvenance(source.file) && !isEnglish(s)
  const lang = isEnglish(s) ? 'en' : officialFr ? 'fr' : source.language || (/https:\/\/en\.onepiece-cardgame\.com\//.test(url) ? 'en' : /https:\/\/fr\.onepiece-cardgame\.com\//.test(url) || isFrench(s) ? 'fr' : 'unknown')
  return [{ original: s, language: lang, status: source.status || (officialFr ? 'official' : 'review_required'), source: source.file }]
}
export function selectTranslation(field: string, values: Candidate[], memory: Memory = {}): Translation {
  const normalized = values.map(c => c.status === 'official' && weakProvenance(c.source) ? { ...c, status: 'review_required' as const } : c)
  const unique = [...new Map(normalized.map(c => [`${c.original}\0${c.source}\0${c.language}\0${c.status}`, c])).values()].sort((a, b) => a.source.localeCompare(b.source) || a.original.localeCompare(b.original) || a.language.localeCompare(b.language) || a.status.localeCompare(b.status))
  const choices: { fr: string; status: Status; source: string; original: string }[] = []
  for (const c of unique) {
    const cached = memory[memoryKey(field, c.original)]
    if (cached && cached.field === field && cached.original === c.original && cached.fr) choices.push({ fr: cached.fr, status: cached.status, source: cached.source || 'translation-memory', original: c.original })
    const labelNeedsMapping = ['type', 'color', 'attribute', 'rarity'].includes(field) && c.original.split('/').every(s => glossary[s.trim()])
    if (c.language === 'fr' && !isEnglish(c.original) && !labelNeedsMapping) choices.push({ fr: c.original, status: c.status, source: c.source, original: c.original })
    // Only complete label matches, never partial replacement inside an effect.
    if (['name', 'type', 'color', 'attribute', 'rarity', 'traits'].includes(field)) {
      const bits = c.original.split('/'); const mapped = bits.map(b => glossary[b.trim()])
      if (mapped.every(Boolean)) choices.push({ fr: mapped.join('/'), status: 'machine', source: 'local-glossary', original: c.original })
    }
  }
  const rank: Record<Status, number> = { official: 4, validated: 3, machine: 2, review_required: 1 }
  choices.sort((a, b) => rank[b.status] - rank[a.status] || a.source.localeCompare(b.source) || a.fr.localeCompare(b.fr))
  const best = choices[0]
  return { original: best?.original || unique[0]?.original || '', fr: best?.fr || null, translationStatus: best?.status || 'review_required', source: best?.source || null, originals: unique }
}
export function parseNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isInteger(value) ? value : null
  const s = str(value); return /^\d+$/.test(s) ? Number(s) : null
}
export function identity(raw: RawCard) {
  const legacyId = str(raw.id)
  let basename = ''
  try { basename = new URL(str(raw.image) || str(raw.imageUrl)).pathname.split('/').pop()?.replace(/\.(png|webp|jpe?g)$/i, '') || '' } catch { /* Local/no URL: legacy id remains usable. */ }
  const code = str(raw.code) || /^([A-Z]+\d*-\d+)/i.exec(legacyId)?.[1] || /^([A-Z]+\d*-\d+)/i.exec(basename)?.[1] || ''
  if (!/^[A-Z]+\d*-\d+$/i.test(code)) throw new Error(`Numéro officiel absent/invalide (${legacyId || 'sans id'})`)
  const number = code.toUpperCase()
  const tokenSource = basename.toUpperCase().startsWith(number) ? basename : legacyId.toUpperCase().startsWith(number) ? legacyId : number
  const suffix = tokenSource.slice(number.length)
  const artToken = suffix || 'standard'
  return { number, artToken, key: `${number}::${artToken}`, legacyId }
}
export function rebuild(observations: { raw: RawCard; source: Source }[], memory: Memory = {}, previous?: Catalog) {
  const conflicts: Conflict[] = []; const variants = new Map<string, Variant>(); const extensionNames = new Map<string, Candidate[]>()
  const refreshedFields = new Set<string>()
  // A partial source can only add observations. Existing identities, memberships and images remain.
  for (const v of previous?.variants || []) variants.set(v.key, structuredClone(v))
  for (const e of previous?.extensions || []) extensionNames.set(e.code, e.name.originals)
  for (const { raw, source } of observations) {
    let id: ReturnType<typeof identity>
    try { id = identity(raw) } catch (e) { conflicts.push({ kind: 'invalid_identity', key: str(raw.id), source: source.file, values: [String(e)] }); continue }
    let v = variants.get(id.key)
    if (!v) {
      v = { ...id, legacyIds: [], extensions: [], editions: [], images: [], sources: [], text: Object.fromEntries(TEXT_FIELDS.map(f => [f, selectTranslation(f, [])])) as Variant['text'], cost: null, power: null, counter: null, life: null, block: null, rarityCode: null, isAltArt: false, isParallel: false, isSpecial: false }
      variants.set(id.key, v)
    }
    if (id.legacyId && !v.legacyIds.includes(id.legacyId)) v.legacyIds.push(id.legacyId)
    if (!v.sources.includes(source.file)) v.sources.push(source.file)
    const codes = [...new Set([...(source.setCode ? [setCode(source.setCode)] : []), ...extensionCodes(str(raw.extension) || str(raw.set)), ...(str(raw.setCode) ? [setCode(str(raw.setCode))] : [])])]
    for (const code of codes) {
      if (!v.extensions.includes(code)) v.extensions.push(code)
      v.editions ||= []
      let edition = v.editions.find(e => e.code === code)
      if (!edition) { edition = { key: `${v.key}@${code}`, code, rarityCodes: [], sources: [], productNames: [] }; v.editions.push(edition) }
      edition.productNames ||= []
      const productName = str(raw.extension) || str(raw.set)
      if (productName && !edition.productNames.includes(productName)) edition.productNames.push(productName)
      if (str(raw.rarity) && !edition.rarityCodes.includes(str(raw.rarity))) edition.rarityCodes.push(str(raw.rarity))
      if (!edition.sources.includes(source.file)) edition.sources.push(source.file)
      const name = str(raw.extension) || str(raw.set) || code
      const cs = candidates({ ...raw, name }, 'name', source)
      extensionNames.set(code, [...(extensionNames.get(code) || []), ...cs])
    }
    for (const field of TEXT_FIELDS) {
      const incoming = candidates(raw, field, source); const refreshKey = `${v.key}\0${source.file}\0${field}`
      const previous = incoming.length && !refreshedFields.has(refreshKey) ? v.text[field].originals.filter(c => c.source !== source.file) : v.text[field].originals
      if (incoming.length) refreshedFields.add(refreshKey)
      v.text[field] = selectTranslation(field, [...previous, ...incoming], memory)
    }
    for (const field of ['cost', 'power', 'counter', 'life'] as const) {
      const n = parseNumber(raw[field]); if (n === null) { if (str(raw[field]) && str(raw[field]) !== '-') conflicts.push({ kind: 'invalid_numeric', key: v.key, field, values: [raw[field]], source: source.file }); continue }
      if (v[field] !== null && v[field] !== n) conflicts.push({ kind: 'numeric_conflict', key: v.key, field, values: [v[field], n], source: source.file })
      else v[field] = n
    }
    const rarity = str(raw.rarity); if (rarity) { if (v.rarityCode && v.rarityCode !== rarity) conflicts.push({ kind: 'rarity_conflict', key: v.key, values: [v.rarityCode, rarity], source: source.file }); else v.rarityCode = rarity }
    v.block ||= str(raw.block) || null
    v.isAltArt ||= raw.isAltArt === true || /_p\d+/i.test(id.artToken)
    v.isParallel ||= raw.isParallel === true || /_p\d+/i.test(id.artToken)
    v.isSpecial ||= raw.isSpecial === true || /\bSP\b/i.test(rarity)
    const url = str(raw.image) || str(raw.imageUrl) || null; const localPath = str(raw.image_local) || null
    if (url || localPath) {
      const key = digest(`${url?.replace(/\?.*$/, '') || ''}\0${localPath || ''}`)
      if (!v.images.some(i => i.key === key)) v.images.push({ key, url, localPath, source: source.file, language: /\/fr\./.test(url || '') ? 'fr' : /\/en\./.test(url || '') ? 'en' : source.language || 'unknown', rights: source.rights || 'authorization_required' })
    }
  }
  for (const v of variants.values()) { v.editions ||= []; for (const e of v.editions) e.productNames ||= [] }
  const sorted = [...variants.values()].sort((a, b) => a.key.localeCompare(b.key))
  const cards = [...new Set(sorted.map(v => v.number))].sort().map(number => ({ number, variants: sorted.filter(v => v.number === number).map(v => v.key) }))
  const extensions = [...extensionNames].sort(([a], [b]) => a.localeCompare(b)).map(([code, names]) => ({ code, family: /^([A-Z]+)-\d+$/.exec(code)?.[1] || 'OTHER', name: selectTranslation('extension', names, memory), variants: sorted.filter(v => v.extensions.includes(code)).map(v => v.key), metadata: previous?.extensions.find(e => e.code === code)?.metadata }))
  const catalog: Catalog = { schemaVersion: 1, cards, variants: sorted, extensions }
  const aliases = new Map<string, Set<string>>()
  for (const v of sorted) for (const id of v.legacyIds) { const keys = aliases.get(id) || new Set<string>(); keys.add(v.key); aliases.set(id, keys) }
  for (const [id, keys] of aliases) if (keys.size > 1) conflicts.push({ kind: 'legacy_alias_conflict', key: id, values: [...keys] })
  return { catalog, conflicts }
}
const translationSchema = z.object({ original: z.string(), fr: z.string().nullable(), translationStatus: z.enum(['official', 'validated', 'machine', 'review_required']), source: z.string().nullable(), originals: z.array(z.object({ original: z.string(), language: z.enum(['fr', 'en', 'unknown']), status: z.enum(['official', 'validated', 'machine', 'review_required']), source: z.string() })) })
export const catalogSchema = z.object({
  schemaVersion: z.literal(1), cards: z.array(z.object({ number: z.string(), variants: z.array(z.string()) })),
  variants: z.array(z.object({ key: z.string(), number: z.string(), artToken: z.string(), legacyIds: z.array(z.string()), extensions: z.array(z.string()), editions: z.array(z.object({ key: z.string(), code: z.string(), rarityCodes: z.array(z.string()), sources: z.array(z.string()), productNames: z.array(z.string()) })), images: z.array(z.object({ key: z.string(), url: z.string().nullable(), localPath: z.string().nullable(), source: z.string(), language: z.string(), rights: z.string() })), sources: z.array(z.string()), text: z.object(Object.fromEntries(TEXT_FIELDS.map(f => [f, translationSchema])) as Record<TextField, typeof translationSchema>), cost: z.number().int().nullable(), power: z.number().int().nullable(), counter: z.number().int().nullable(), life: z.number().int().nullable(), block: z.string().nullable(), rarityCode: z.string().nullable(), isAltArt: z.boolean(), isParallel: z.boolean(), isSpecial: z.boolean() })),
  extensions: z.array(z.object({ code: z.string(), family: z.string(), name: translationSchema, variants: z.array(z.string()), metadata: z.object({ legacyIds: z.array(z.string()), descriptions: translationSchema, observedReleaseDates: z.array(z.string()), imageUrls: z.array(z.string()), sources: z.array(z.string()) }).optional() })),
})
export function validateCatalog(catalog: Catalog) {
  const parsed = catalogSchema.safeParse(catalog); const errors: string[] = parsed.success ? [] : parsed.error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
  const variants = new Map(catalog.variants.map(v => [v.key, v])); const cards = new Set(catalog.cards.map(c => c.number)); const sets = new Map(catalog.extensions.map(e => [e.code, e]))
  if (variants.size !== catalog.variants.length) errors.push('duplicate_variant_key')
  if (cards.size !== catalog.cards.length) errors.push('duplicate_card_number')
  if (sets.size !== catalog.extensions.length) errors.push('duplicate_extension_code')
  for (const v of catalog.variants) {
    if (v.key !== `${v.number}::${v.artToken}` || !cards.has(v.number)) errors.push(`invalid_identity:${v.key}`)
    if (!v.extensions.length) errors.push(`unassigned_variant:${v.key}`)
    for (const code of v.extensions) if (!sets.get(code)?.variants.includes(v.key)) errors.push(`invalid_membership:${v.key}:${code}`)
    for (const e of v.editions) if (e.key !== `${v.key}@${e.code}` || !v.extensions.includes(e.code)) errors.push(`invalid_edition:${e.key}`)
  }
  for (const e of catalog.extensions) for (const key of e.variants) if (!variants.get(key)?.extensions.includes(e.code)) errors.push(`invalid_reverse_membership:${e.code}:${key}`)
  for (const c of catalog.cards) for (const key of c.variants) if (variants.get(key)?.number !== c.number) errors.push(`invalid_card_variant:${c.number}:${key}`)
  return errors
}
export function translationSafety(original: string, translated: string) {
  const tokens = (s: string) => s.replace(/−/g, '-').match(/[+-]?\d+(?:[.,]\d+)?|DON!!|[A-Z]+\d*-\d+|\{[^}]+\}/g) || []
  return JSON.stringify(tokens(original)) === JSON.stringify(tokens(translated))
}
