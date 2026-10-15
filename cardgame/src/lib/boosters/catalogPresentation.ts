import type { BoosterCatalogItem } from './types'
import PRESENTATION from './booster-presentation.json'

const NAMES = (PRESENTATION as { names: Record<string, { title: string; language: 'fr' | 'en' }> }).names
/** Official product title archived for the code (scripts/boosters/booster-presentation.ts), else the catalogue name. */
export const boosterTitle = (set: Pick<BoosterCatalogItem, 'code' | 'name'>) => NAMES[set.code]?.title ?? set.name
const FAMILY_ORDER = ['OP', 'EB', 'PRB']
/** Natural order: OP-01, OP-02 … OP-13, OP14-EB04, OP15-EB04, OP-16 …, then EB-xx, then PRB-xx. */
export function compareCodes(a: string, b: string) {
  const parse = (code: string) => { const m = code.toUpperCase().match(/^([A-Z]+)-?(\d+)/); return { family: m?.[1] ?? code, number: Number(m?.[2] ?? 0) } }
  const x = parse(a), y = parse(b), rank = (f: string) => FAMILY_ORDER.includes(f) ? FAMILY_ORDER.indexOf(f) : FAMILY_ORDER.length
  return rank(x.family) - rank(y.family) || x.family.localeCompare(y.family) || x.number - y.number || a.localeCompare(b)
}

