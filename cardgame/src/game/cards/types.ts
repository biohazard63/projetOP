import type { LifeEvidence } from './leaderLife'
export type CardCategory = 'LEADER' | 'CHARACTER' | 'EVENT' | 'STAGE' | 'DON'
export type CardColor = 'RED' | 'GREEN' | 'BLUE' | 'PURPLE' | 'BLACK' | 'YELLOW'
export type SourceReference = { source: string; checkedAt: string; language: 'fr' | 'en'; detail: string }
export type EffectSpec =
  | { kind: 'declarative'; abilityIds: string[] }
  | { kind: 'giveRestedDon'; timing: 'ACTIVATE_MAIN'; oncePerTurn: true; amount: { min: 0; max: 1 }; from: 'OWN_COST_RESTED'; target: 'OWN_LEADER_OR_CHARACTER' }
  | { kind: 'blocker'; timing: 'BLOCK'; cost: 'REST_SELF'; target: 'SELF' }

/** Keywords are explicit reviewed metadata, never inferred from scraped rules text. */
export type CombatKeyword = 'RUSH' | 'RUSH_CHARACTER' | 'DOUBLE_ATTACK' | 'BANISH' | 'UNBLOCKABLE'
export type CounterEventSpec =
  | { kind: 'DON_MINUS_POWER'; printedCost: number; donMinus: number; powerBonus: number }
  | { kind: 'OPTIONAL_LIFE_POWER'; printedCost: number; powerBonus: number }
  | { kind: 'DECLARATIVE'; printedCost: number; abilityId: string; programVersion: '1.0.0' }

export type CardReview = {
  revision: string
  references: SourceReference[]
  faqChecked: boolean
  errataChecked: boolean
  // Empty is an explicit reviewed absence of effects, never an inferred regex result.
  effects: EffectSpec[]
  effectOriginal: string
  effectFr: string
  translationStatus: 'non_official_review_required'
  triggerOriginal: string
  triggerFr: string
  requiredCapabilities: string[]
  playabilityStatus?: 'PLAYABLE_VERIFIED' | 'DATA_VALID_EFFECT_PENDING' | 'UNSUPPORTED_MECHANIC' | 'AMBIGUOUS_RULE' | 'INVALID_DATA'
  combatKeywords?: CombatKeyword[]
  counterEvent?: CounterEventSpec
}
export type CardInput = {
  number: string; printingKey: string; databaseIds: string[]; nameFr: string; rulesName: string
  category: string; colors: string | string[]; attributes: string[]; traits: string[]
  cost: unknown; power: unknown; counter: unknown; life: unknown; block: string | null
  extensions: string[]; lifeEvidence?: LifeEvidence[]; review?: CardReview; conflicts?: string[]
}
export type CardDefinition = {
  definitionId: string; number: string; revision: string; nameFr: string; rulesName: string
  category: CardCategory; colors: CardColor[]; attributes: string[]; traits: string[]
  cost: number | null; power: number | null; counter: number | null; life: number | null; block: string | null
  lifeEvidence: LifeEvidence[]
  review: CardReview
}
export type CardPrinting = { printingKey: string; definitionId: string; databaseIds: string[]; extensions: string[] }
export type AdaptedCard = { definition: CardDefinition; printing: CardPrinting }
export type AdapterResult = { ok: true; card: AdaptedCard } | { ok: false; errors: string[] }
