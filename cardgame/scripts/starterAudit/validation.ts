export type CardType = 'LEADER' | 'CHARACTER' | 'EVENT' | 'STAGE'
export type CardSpec = { name: string; quantity: number; cardNumber?: string; type: CardType; printingCode?: string; prismaId?: string }
export type DeckSpec = { deckName: string; deckCode: string; cards: CardSpec[] }
export type CatalogCard = { id: string; code: string; name: string; type: string; color: string; cost?: number | null; power?: number | null; counter?: string | null;
  attribute?: string | null; family?: string | null; effect?: string | null; ability?: string | null; trigger?: string | null;
  imageUrl?: string; isAltArt?: boolean; isParallel?: boolean; isSpecial?: boolean; setCode?: string | null }
export type Resolution =
  | { status: 'RESOLVED'; card: CatalogCard | null; method: 'NUMBER' | 'NAME' | 'EXPLICIT_ID'; variants: string[]; variantKind: 'SINGLE' | 'VISUAL_VARIANTS' | 'POTENTIAL_DUPLICATE_IMPORTS'; appearance: 'RESOLVED' | 'NEEDS_SELECTION' }
  | { status: 'BLOCKED'; reason: string; candidates: string[] }
export type ProductEvidence = {
  compositionVerified: boolean
  reasons: string[]
  donCount: number | null
  leaders: string[]
  officialCards: { cardNumber: string; name: string; type: CardType; color: string }[]
  bonuses: { description: string; random: boolean }[]
  sources: string[]
  localizedReferences?: LocalizedReference[]
}
export type LocalizedReference = { cardNumber: string; locale: string; type: string; color: string; cost: number | null; power: number | null; counter: number | null;
  attributeHash: string; familyHash: string; effectHash: string; triggerHash: string; source: string }

/** Strip only known printing suffixes. Never equate two different numbered cards. */
export function canonicalCardNumber(code: string): string | null {
  return /^(?:ST|OP|EB|PRB)\d{2}-\d{3}(?:_[pr]\d+)*$|^P-\d{3}(?:_[pr]\d+)*$/i.test(code)
    ? code.replace(/(?:_[pr]\d+)+$/i, '').toUpperCase() : null
}

const normalizedName = (name: string) => name.normalize('NFKC').toLowerCase().replace(/[.\s‘’'"`]+/g, '')
const blocked = (reason: string, rows: CatalogCard[] = []): Resolution => ({ status: 'BLOCKED', reason, candidates: rows.map(row => row.id).sort() })

const cleanText = (value: string | null | undefined) => {
  const text = (value ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim()
  return text === '-' || text === '–' ? '' : text
}
const hashText = (value: string | null | undefined) => createHash('sha256').update(cleanText(value).replace(/\s+/g, '')).digest('hex')
const normalizedType = (type: string) => ({ PERSONNAGE: 'CHARACTER', 'ÉVÉNEMENTS': 'EVENT', EVENEMENT: 'EVENT', 'ÉVÉNEMENT': 'EVENT', LIEU: 'STAGE' }[type.toUpperCase()] ?? type.toUpperCase())
const counterValue = (value: string | null | undefined) => value == null || value.trim() === '' || value === '-' ? null : /^\d+$/.test(value) ? Number(value) : value
function structuralFingerprint(card: CatalogCard): string {
  const type = normalizedType(card.type)
  return JSON.stringify({ type, colors: colors(card.color), cost: type === 'LEADER' ? 'NOT_APPLICABLE' : card.cost,
    power: type === 'EVENT' || type === 'STAGE' ? 'NOT_APPLICABLE' : card.power,
    counter: type !== 'CHARACTER' ? 'NOT_APPLICABLE' : counterValue(card.counter) })
}
function gameplayFingerprint(card: CatalogCard): string {
  return JSON.stringify({ structural: structuralFingerprint(card),
    attribute: cleanText(card.attribute), family: cleanText(card.family), effect: cleanText(card.effect || card.ability), trigger: cleanText(card.trigger) })
}
function matchesOfficialLocale(card: CatalogCard, references: LocalizedReference[]): boolean {
  const type = normalizedType(card.type)
  return references.some(ref => ref.cardNumber === canonicalCardNumber(card.code) && ref.type === type
    && JSON.stringify(colors(ref.color)) === JSON.stringify(colors(card.color))
    && (type === 'EVENT' || type === 'STAGE' || ref.power === card.power)
    && (type === 'LEADER' || ref.cost === card.cost) && (type !== 'CHARACTER' || ref.counter === counterValue(card.counter))
    && ref.attributeHash === hashText(card.attribute) && ref.familyHash === hashText(card.family)
    && ref.effectHash === hashText(card.effect || card.ability) && ref.triggerHash === hashText(card.trigger))
}
function matchesOfficialCharacteristics(card: CatalogCard, references: LocalizedReference[]): boolean {
  const type = normalizedType(card.type)
  return references.some(ref => ref.cardNumber === canonicalCardNumber(card.code) && ref.type === type
    && JSON.stringify(colors(ref.color)) === JSON.stringify(colors(card.color))
    && (type === 'EVENT' || type === 'STAGE' || ref.power === card.power)
    && (type === 'LEADER' || ref.cost === card.cost) && (type !== 'CHARACTER' || ref.counter === counterValue(card.counter)))
}
function printingIdentity(card: CatalogCard): string | null {
  const filename = card.imageUrl?.split('?')[0].split('/').pop()?.replace(/\.(?:png|webp|jpe?g)$/i, '').toUpperCase()
  return filename && canonicalCardNumber(filename) ? filename : null
}
function selectPrinting(spec: CardSpec, rows: CatalogCard[], method: 'NUMBER' | 'NAME', references: LocalizedReference[]): Resolution {
  if (rows.some(card => normalizedType(card.type) !== spec.type)) return blocked('TYPE_MISMATCH', rows)
  if (references.length && !rows.every(card => matchesOfficialCharacteristics(card, references))) return blocked('OFFICIAL_CHARACTERISTIC_MISMATCH', rows)
  if (new Set(rows.map(structuralFingerprint)).size > 1) return blocked('CHARACTERISTIC_CONFLICT', rows)
  if (new Set(rows.map(gameplayFingerprint)).size > 1 && !rows.every(card => matchesOfficialLocale(card, references))) return blocked('EFFECT_CONFLICT_OR_UNREVIEWED_TRANSLATION', rows)
  const visualIdentities = new Set(rows.map(card => card.imageUrl?.split(/[?#]/)[0] ?? card.code))
  const variantKind = rows.length === 1 ? 'SINGLE' : visualIdentities.size > 1 ? 'VISUAL_VARIANTS' : 'POTENTIAL_DUPLICATE_IMPORTS'
  let candidates = spec.printingCode ? rows.filter(card => printingIdentity(card) === spec.printingCode?.toUpperCase()) : []
  if (!spec.printingCode) {
    candidates = rows.filter(card => card.isAltArt === false && card.isParallel === false && card.isSpecial === false
      && printingIdentity(card) === canonicalCardNumber(card.code))
  }
  // Language preference is explicit user policy; never break a tie between two FR prints by database order.
  const french = candidates.filter(card => card.imageUrl?.startsWith('https://fr.onepiece-cardgame.com/'))
  const card = french.length === 1 ? french[0] : candidates.length === 1 ? candidates[0] : rows.length === 1 && !spec.printingCode ? rows[0] : null
  return { status: 'RESOLVED', card, method, variants: rows.map(row => row.id).sort(), variantKind, appearance: card ? 'RESOLVED' : 'NEEDS_SELECTION' }
}

export function resolveCard(spec: CardSpec, catalog: CatalogCard[], references: LocalizedReference[] = []): Resolution {
  if (!Number.isSafeInteger(spec.quantity) || spec.quantity < 1) return blocked('INVALID_QUANTITY')
  if (!['LEADER', 'CHARACTER', 'EVENT', 'STAGE'].includes(spec.type)) return blocked('INVALID_TYPE')
  if (spec.cardNumber && canonicalCardNumber(spec.cardNumber) !== spec.cardNumber) return blocked('INVALID_CANONICAL_NUMBER')
  if (spec.prismaId) {
    const rows = catalog.filter(row => row.id === spec.prismaId)
    if (rows.length !== 1) return blocked('UNKNOWN_OR_DUPLICATED_ID', rows)
    const card = rows[0]
    if (normalizedType(card.type) !== spec.type) return blocked('TYPE_MISMATCH', rows)
    if (spec.cardNumber && canonicalCardNumber(card.code) !== canonicalCardNumber(spec.cardNumber)) return blocked('NUMBER_MISMATCH', rows)
    const identity = selectPrinting({ ...spec, printingCode: undefined }, catalog.filter(row => canonicalCardNumber(row.code) === canonicalCardNumber(card.code)), 'NUMBER', references)
    if (identity.status === 'BLOCKED') return identity
    return { ...identity, card, method: 'EXPLICIT_ID', appearance: 'RESOLVED' }
  }
  if (spec.cardNumber) {
    const number = canonicalCardNumber(spec.cardNumber)
    if (!number || number !== spec.cardNumber) return blocked('INVALID_CANONICAL_NUMBER')
    const rows = catalog.filter(row => canonicalCardNumber(row.code) === number)
    if (!rows.length) return blocked('NUMBER_NOT_FOUND')
    return selectPrinting(spec, rows, 'NUMBER', references)
  }
  const rows = catalog.filter(row => normalizedType(row.type) === spec.type && normalizedName(row.name) === normalizedName(spec.name))
  const numbers = new Set(rows.map(row => canonicalCardNumber(row.code)))
  if (numbers.size > 1) return blocked('AMBIGUOUS_NAME', rows)
  if (!rows.length) return blocked('NAME_NOT_FOUND')
  if (numbers.has(null)) return blocked('INVALID_CATALOG_NUMBER', rows)
  return selectPrinting(spec, rows, 'NAME', references)
}

const colorAliases: Record<string, string> = { rouge: 'red', vert: 'green', bleu: 'blue', violet: 'purple', noir: 'black', jaune: 'yellow' }
function colors(value: string): string[] {
  return value.toLowerCase().split(/\s*[/,]\s*/).map(color => colorAliases[color] ?? color).sort()
}

/** Product validation is deliberately separate from choosing one Leader for a playable deck. */
export function auditDeck(deck: DeckSpec, evidence: ProductEvidence, catalog: CatalogCard[] | null) {
  const issues = [...evidence.reasons]
  if (!evidence.compositionVerified) issues.push('COMPOSITION_UNVERIFIED')
  if (evidence.donCount !== 10) issues.push('DON_CONTENT_UNVERIFIED')
  const entries = deck.cards.map(spec => ({ ...spec, resolution: catalog ? resolveCard(spec, catalog, evidence.localizedReferences) : blocked('PRISMA_NOT_TESTED') }))
  const counts = new Map<string, number>()
  for (const spec of deck.cards) {
    if (!spec.cardNumber) { issues.push(`NUMBER_UNRESOLVED:${spec.name}`); continue }
    counts.set(spec.cardNumber, (counts.get(spec.cardNumber) ?? 0) + spec.quantity)
    if (!Number.isSafeInteger(spec.quantity) || spec.quantity < 1) issues.push(`INVALID_QUANTITY:${spec.cardNumber}`)
    const official = evidence.officialCards.find(card => card.cardNumber === spec.cardNumber)
    if (!official || official.type !== spec.type || official.name !== spec.name) issues.push(`OFFICIAL_IDENTITY_MISMATCH:${spec.cardNumber}`)
  }
  const leaderSpecs = deck.cards.filter(card => card.type === 'LEADER')
  const main = deck.cards.filter(card => card.type !== 'LEADER')
  const mainCount = main.reduce((sum, card) => sum + card.quantity, 0)
  if (mainCount !== 50) issues.push(`MAIN_COUNT:${mainCount}`)
  if (!leaderSpecs.length || leaderSpecs.some(card => card.quantity !== 1)) issues.push('INVALID_PRODUCT_LEADERS')
  if (JSON.stringify(leaderSpecs.map(card => card.cardNumber).sort()) !== JSON.stringify([...evidence.leaders].sort())) issues.push('PRODUCT_LEADERS_MISMATCH')
  for (const [number, quantity] of counts) if (quantity > 4) issues.push(`COPY_LIMIT:${number}`)
  if (counts.size !== deck.cards.length) issues.push('DUPLICATE_OR_MISSING_NUMBER_ENTRY')
  for (const entry of entries) if (entry.resolution.status === 'BLOCKED') issues.push(`${entry.resolution.reason}:${entry.cardNumber ?? entry.name}`)
  const playable = leaderSpecs.map(leader => {
    const officialLeader = evidence.officialCards.find(card => card.cardNumber === leader.cardNumber)
    const leaderColors = officialLeader ? colors(officialLeader.color) : []
    const errors = main.flatMap(card => {
      const official = evidence.officialCards.find(row => row.cardNumber === card.cardNumber)
      return official && colors(official.color).every(color => leaderColors.includes(color)) ? [] : [`COLOR_MISMATCH:${card.cardNumber}`]
    })
    return { leaderNumber: leader.cardNumber, mainCount, donCount: evidence.donCount, structuralLegal: mainCount === 50 && errors.length === 0, errors }
  })
  if (playable.some(option => !option.structuralLegal)) issues.push('PLAYABLE_STRUCTURAL_RULES_FAILED')
  const uniqueIssues = [...new Set(issues)]
  const status: 'VERIFIED' | 'PARTIAL' | 'BLOCKED' = uniqueIssues.length === 0 ? 'VERIFIED'
    : !evidence.compositionVerified && mainCount > 0 && !uniqueIssues.some(issue => issue.startsWith('AMBIGUOUS_') || issue.startsWith('NUMBER_NOT_FOUND')) ? 'PARTIAL' : 'BLOCKED'
  return { deckCode: deck.deckCode, deckName: deck.deckName, status, importReady: status === 'VERIFIED' && entries.every(entry => entry.resolution.status === 'RESOLVED' && entry.resolution.card !== null), mainCount, leaders: leaderSpecs.map(card => card.cardNumber), donCount: evidence.donCount,
    issues: uniqueIssues, entries, playable, bonuses: evidence.bonuses, tournamentLegality: 'NOT_TESTED' as const, engineCertification: 'NOT_TESTED' as const }
}
import { createHash } from 'node:crypto'

