export type LifeEvidence = { value: number; source: string; language: 'fr' | 'en' | 'local'; field: 'life' | 'cost'; printing?: string; checkedAt?: string }
export function resolveLeaderLife(evidence: LifeEvidence[]) {
  // Legacy cost values remain candidates only, even when plausible or zero.
  const trusted = evidence.filter(e => e.field === 'life' && e.language !== 'local' && e.checkedAt && /^https:\/\/(?:fr|en)\.onepiece-cardgame\.com\/cardlist\//.test(e.source))
  if (trusted.some(e => !Number.isSafeInteger(e.value) || e.value < 0)) return { life: null, status: 'ambiguous' as const, evidence: trusted }
  const values = [...new Set(trusted.map(e => e.value))]
  return { life: values.length === 1 ? values[0] : null, status: values.length === 1 ? 'verified' as const : values.length ? 'ambiguous' as const : 'missing' as const, evidence: trusted }
}
