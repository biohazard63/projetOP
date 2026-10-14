import type { CardInput, CombatKeyword, EffectSpec } from './types'

// M6 generic projection of a local cardJson row into a reviewed engine card. Characteristics and texts are read
// from the row only; the official card-list URL of the row, the FAQ and the errata page are the review sources.
// A Leader's Life is read from the row's `cost` field (catalogue convention) and justified by the official card list
// "Life" field (pages archived in docs/game/evidence/m6/sources/leader-life.json).
export type LocalRow = { code: string; name: string; type: string; cost: string; power: string; counter: string; color: string; attribute: string; types: string; effect: string; trigger: string; url: string }
export type LocalProfile = {
  /** Ids of the declarative abilities of this card (its Trigger ability id included when it has one). */
  abilityIds?: string[]
  blocker?: boolean
  keywords?: CombatKeyword[]
  counterEvent?: { abilityId: string }
  /** Capabilities this card needs from the ruleset. */
  capabilities?: string[]
  /** Only when the card list row prints the cost as "-": the cost printed on the official card image (`source`), never assumed. */
  printedCostFromImage?: { value: number; source: string; checkedAt: string }
}
const categoryMap: Record<string, CardInput['category']> = { LEADER: 'LEADER', CHARACTER: 'CHARACTER', EVENT: 'EVENT', STAGE: 'STAGE' }
const colorMap: Record<string, string> = { RED: 'RED', GREEN: 'GREEN', BLUE: 'BLUE', PURPLE: 'PURPLE', BLACK: 'BLACK', YELLOW: 'YELLOW' }
const attributeMap: Record<string, string> = { STRIKE: 'STRIKE', SLASH: 'SLASH', RANGED: 'RANGED', SPECIAL: 'SPECIAL', WISDOM: 'WISDOM' }
const num = (value: string, number: string): number | null => {
  const v = String(value ?? '').trim()
  if (!v || v === '-') return null
  if (!/^\d+$/.test(v)) throw new Error(`INVALID_LOCAL_CARD_DATA:${number}`)
  return Number(v)
}

export function localCard(row: LocalRow, setCode: string, sourcePath: string, revision: string, faqUrl: string, reviewedAt: string, profile: LocalProfile = {}): CardInput {
  const number = row.code
  const category = categoryMap[row.type.trim().toUpperCase()]
  const colors = row.color.split(/[\s/,]+/).filter(Boolean).map(c => colorMap[c.toUpperCase()])
  const attributes = row.attribute.trim() === '-' || !row.attribute.trim() ? [] : row.attribute.split(/[\s/,]+/).filter(Boolean).map(a => attributeMap[a.toUpperCase()])
  if (!category || !colors.length || colors.some(c => !c) || attributes.some(a => !a)) throw new Error(`INVALID_LOCAL_CARD_DATA:${number}`)
  const leader = category === 'LEADER'
  if (profile.printedCostFromImage && (leader || String(row.cost ?? '').trim() !== '-' || !Number.isSafeInteger(profile.printedCostFromImage.value) || profile.printedCostFromImage.value < 0)) throw new Error(`INVALID_COST_OVERRIDE:${number}`)
  const printedCost = profile.printedCostFromImage ? profile.printedCostFromImage.value : num(row.cost, number)
  const life = leader ? num(row.cost, number) : null
  if (leader && life === null) throw new Error(`LEADER_LIFE_MISSING:${number}`)
  const effects: EffectSpec[] = [...(profile.blocker ? [{ kind: 'blocker' as const, timing: 'BLOCK' as const, cost: 'REST_SELF' as const, target: 'SELF' as const }] : []),
    ...(profile.abilityIds?.length ? [{ kind: 'declarative' as const, abilityIds: profile.abilityIds }] : [])]
  const trigger = (row.trigger ?? '').trim() === '-' ? '' : (row.trigger ?? '').trim()
  // A Character printed with power "-" (official card list too) is normalised to 0, as for OP01-006; the
  // normalisation is recorded in the card-list reference detail.
  const printedPower = num(row.power, number), dashPower = category === 'CHARACTER' && printedPower === null
  return {
    number, printingKey: `${number}::standard`, databaseIds: [], nameFr: row.name, rulesName: row.name, category, colors, attributes,
    traits: row.types.split('/').map(t => t.trim()).filter(Boolean),
    cost: leader ? null : printedCost, power: dashPower ? 0 : printedPower, counter: num(row.counter, number), life, block: null, extensions: [setCode],
    ...(leader ? { lifeEvidence: [{ value: life!, source: row.url, language: 'en' as const, field: 'life' as const, checkedAt: '2026-10-12' }] } : {}),
    review: {
      revision,
      references: [
        { source: row.url, checkedAt: reviewedAt, language: 'en', detail: `Official card list row; local copy ${sourcePath}${dashPower ? '; printed power "-" normalised to 0' : ''}` },
        { source: faqUrl, checkedAt: reviewedAt, language: 'en', detail: `${setCode} FAQ entries for ${number} reviewed` },
        { source: 'https://en.onepiece-cardgame.com/rules/errata_card/', checkedAt: reviewedAt, language: 'en', detail: 'Errata page checked against the local text' },
        ...(profile.printedCostFromImage ? [{ source: profile.printedCostFromImage.source, checkedAt: profile.printedCostFromImage.checkedAt, language: 'en' as const, detail: `Card list prints the cost as "-"; the official card image prints ${profile.printedCostFromImage.value}` }] : []),
      ],
      faqChecked: true, errataChecked: true, effects, effectOriginal: (row.effect ?? '').trim() === '-' ? '' : (row.effect ?? '').trim(), effectFr: '',
      translationStatus: 'non_official_review_required', triggerOriginal: trigger, triggerFr: '',
      requiredCapabilities: [...new Set([...(profile.blocker ? ['blocker'] : []), ...(profile.abilityIds?.length ? ['declarative'] : []), ...(trigger ? ['trigger'] : []), ...(profile.counterEvent ? ['counterEvent'] : []), ...(profile.capabilities ?? [])])],
      playabilityStatus: 'DATA_VALID_EFFECT_PENDING',
      ...(profile.keywords?.length ? { combatKeywords: profile.keywords } : {}),
      ...(profile.counterEvent ? { counterEvent: { kind: 'DECLARATIVE' as const, printedCost: printedCost ?? 0, abilityId: profile.counterEvent.abilityId, programVersion: '1.0.0' as const } } : {}),
    },
  }
}
