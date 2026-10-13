export type StarterCompositionSourceRow = { code: string; name: string; type: string }
export type StarterCompositionNameResolution =
  | { number: string; status: 'RESOLVED'; method?: 'VERIFIED_ALIAS' | 'REBUILD_SCRIPT_NAME' }
  | { number: null; status: 'AMBIGUOUS'; candidates: string[] }
  | { number: null; status: 'NOT_FOUND'; candidates: string[] }

const verifiedAliases: Record<string, string> = {
  'ST-04::all star calamity': 'ST04-014',
  'ST-05::karina': 'ST05-005',
  'ST-05::guild tesoro': 'ST05-006',
  'ST-05::scarlett': 'ST05-009',
  'ST-06::navy headquarters': 'ST06-017',
  // "Elephant" occurs in exactly one local ST-12 name (ST12-009 Elephant True Bluefin, a tuna); it is also the only
  // Character number of the set the list leaves unmatched, with the quantity 4 the list gives.
  'ST-12::elephant tuna': 'ST12-009',
}

// Candidate pairs are deliberately not resolved: the old product-list names do not prove
// which local title they refer to, even though each deck's unmatched cards narrow the options.
// ST-03 "Desert Spada" / "Perfume Femur" are not listed: the rebuild script's own cross-set lookup finds cards with exactly
// these names (resolveByRebuildScriptName below), and the script is the composition reference.
const unresolvedAlternatives: Record<string, string[]> = {
  'ST-05::shishi odoshi goshojimaki': ['ST05-016', 'ST05-017'],
  'ST-05::armor mode': ['ST05-016', 'ST05-017'],
  // Two technique names for the two remaining Events; each has quantity 2, so the deck list is the same either way
  // (starterDecks.ts accepts such an equal-quantity group without choosing a mapping).
  'ST-12::shishi sonson': ['ST12-016', 'ST12-017'],
  'ST-12::mouton shot': ['ST12-016', 'ST12-017'],
}

const fold = (value: string) => value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[‘’'`".]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const canonical = (code: string) => code.replace(/_p\d+$/i, '').toUpperCase()

/** Resolves product-list names only against that deck's local card rows; uncertain title aliases remain blocked. */
export function resolveStarterCompositionName(
  deckCode: string,
  name: string,
  rows: StarterCompositionSourceRow[],
  options: { inferLeader?: boolean } = {},
): StarterCompositionNameResolution {
  const key = `${deckCode}::${fold(name)}`
  const possible = unresolvedAlternatives[key]
  if (possible) return { number: null, status: 'AMBIGUOUS', candidates: [...possible] }

  const alias = verifiedAliases[key]
  if (alias) {
    const matches = rows.filter(row => canonical(row.code) === alias)
    if (matches.length === 1) return { number: alias, status: 'RESOLVED', method: 'VERIFIED_ALIAS' }
    return { number: null, status: matches.length > 1 ? 'AMBIGUOUS' : 'NOT_FOUND', candidates: matches.map(row => canonical(row.code)).sort() }
  }

  const resolvedName = name.replace(/\([^)]*\)/g, ' ')
  const tokens = fold(resolvedName).split(' ').filter(token => token.length > 1)
  const wantsCharacter = /\((character|personnage)\)/i.test(name)
  const wantsLeader = /leader/i.test(name) || (options.inferLeader === true && !wantsCharacter)
  let candidates = rows.filter(row => {
    const candidateName = fold(row.name)
    const candidateTokens = candidateName.split(' ')
    return tokens.length > 0 && tokens.every(token => candidateTokens.includes(token) || candidateName.includes(token))
      && (wantsLeader ? row.type === 'LEADER' : row.type !== 'LEADER')
      && (!wantsCharacter || row.type === 'CHARACTER')
  })
  const numbers = [...new Set(candidates.map(row => canonical(row.code)))].sort()
  if (numbers.length === 1) return { number: numbers[0], status: 'RESOLVED' }
  if (numbers.length > 1) {
    candidates = candidates.filter(row => fold(row.name) === fold(resolvedName))
    const exact = [...new Set(candidates.map(row => canonical(row.code)))].sort()
    if (exact.length === 1) return { number: exact[0], status: 'RESOLVED' }
    return { number: null, status: 'AMBIGUOUS', candidates: exact.length ? exact : numbers }
  }
  return { number: null, status: 'NOT_FOUND', candidates: [] }
}

// Mirror of scripts/rebuildStarterDecks.ts (read as text, never executed): when no card of the deck's set matches, the
// script looks the name up in every set (`name contains`, then every token of the name, Leader or not). Its first-match
// pick depends on database order, so only a lookup giving one card number is accepted; several numbers stay ambiguous.
const scriptSafe = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\p{P}+/gu, ' ').replace(/\s+/g, ' ').trim()
const scriptStripParen = (s: string) => s.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
function scriptVariants(raw: string): string[] {
  const variants = new Set([raw, scriptStripParen(raw)])
  const inner = raw.match(/\(([^)]*)\)/)?.[1]
  if (inner) variants.add(inner)
  for (const v of [...variants]) variants.add(v.replace(/quichotte/gi, 'quixote').replace(/mont d[’'`]or/gi, "mont d'or"))
  return [...variants]
}

/** The rebuild script's cross-set name fallback over all local cardJson rows (wanted Leader first, then the other kind). */
export function resolveByRebuildScriptName(name: string, allRows: StarterCompositionSourceRow[], wantLeader: boolean): StarterCompositionNameResolution {
  for (const leader of [wantLeader, !wantLeader]) {
    for (const variant of scriptVariants(name)) {
      const contained = scriptStripParen(variant).toLowerCase()
      const tokens = scriptSafe(variant).split(' ').filter(t => t.length > 1)
      const matches = allRows.filter(row => row.name.toLowerCase().includes(contained) && tokens.length > 0
        && tokens.every(t => scriptSafe(scriptStripParen(row.name)).includes(t)) && (row.type === 'LEADER') === leader)
      const numbers = [...new Set(matches.map(row => canonical(row.code)))].sort()
      if (numbers.length === 1) return { number: numbers[0], status: 'RESOLVED', method: 'REBUILD_SCRIPT_NAME' }
      if (numbers.length > 1) return { number: null, status: 'AMBIGUOUS', candidates: numbers }
    }
  }
  return { number: null, status: 'NOT_FOUND', candidates: [] }
}
