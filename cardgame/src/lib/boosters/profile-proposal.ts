import { z } from 'zod'
import { metadataVariant, type DrawCard } from './generator'
import { normalizeRarity, normalizeSetCode, rulesSchema, type BoosterRules } from './rules'
import { isBoosterProduct } from './products'

const variant = z.enum(['standard', 'alt', 'parallel', 'special'])
export const profileProposalSchema = z.object({
  status: z.literal('proposal'), setCode: z.string().min(1), source: z.string().min(1),
  base: z.array(z.object({rarity: z.string().min(1), variant, count: z.number().int().positive().max(29)}).strict()).min(1),
  outcomes: z.array(z.object({label: z.string().min(1), rarity: z.string().min(1), variant, weight: z.number().finite().positive()}).strict()).min(1).max(20),
  omittedBonusPools: z.array(z.string()),
}).strict()
export type ProfileProposal = z.infer<typeof profileProposalSchema>

// Reviewable internal balancing proposal. Never an official rate or a runtime
// fallback: the exact weights and omissions are written into a preview file.
export function proposeProfile(setCode: string, cards: DrawCard[]): ProfileProposal {
  if (!isBoosterProduct(setCode)) throw new Error('Produit hors familles boosters')
  const code = normalizeSetCode(setCode)
  const has = (rarity: string, kind: z.infer<typeof variant>) => cards.some(c => c.setCode === setCode && normalizeRarity(c.rarity) === rarity && metadataVariant(c) === kind)
  const base: ProfileProposal['base'] = code.startsWith('EB')
    ? [{rarity:'C',variant:'standard',count:8},{rarity:'R',variant:'standard',count:3}]
    : code.startsWith('PRB')
      ? [{rarity:'C',variant:'standard',count:4},{rarity:'UC',variant:'standard',count:2},{rarity:'R',variant:'standard',count:3},{rarity:'L',variant:'standard',count:1},{rarity:'SR',variant:'standard',count:1}]
      : [{rarity:'C',variant:'standard',count:6},{rarity:'UC',variant:'standard',count:3},{rarity:'R',variant:'standard',count:2}]
  const omittedBonusPools: string[] = []
  let standardSR = 65
  const outcomes: ProfileProposal['outcomes'] = [
    {label:'SEC standard',rarity:'SEC',variant:'standard',weight:10},
    {label:'Leader standard',rarity:'L',variant:'standard',weight:4},
  ]
  for (const item of [
    {label:'Carte spéciale',rarity:'SP CARD',variant:'special' as const,weight:.8},
    {label:'Treasure Rare',rarity:'TR',variant:'alt' as const,weight:.2},
  ]) {
    if (has(item.rarity,item.variant)) outcomes.push(item)
    else { omittedBonusPools.push(`${item.rarity}/${item.variant}`); standardSR += item.weight }
  }
  // ALT budget is 20% per pack, independent of the number of illustrations.
  // Split between actually present categories at proposal time, not during draw.
  const altWeights: Record<string,number> = {C:1,UC:1,R:3,SR:10,L:3,SEC:2}
  const alternatives = Object.entries(altWeights).filter(([rarity]) => {
    if (has(rarity,'alt')) return true
    omittedBonusPools.push(`${rarity}/alt`); return false
  })
  const total = alternatives.reduce((sum,[,weight])=>sum+weight,0)
  if (!total) throw new Error('Aucune alternative identifiée : revue du catalogue requise')
  for (const [rarity,weight] of alternatives) outcomes.push({label:`ALT ${rarity}`,rarity,variant:'alt',weight:20*weight/total})
  outcomes.unshift({label:'SR standard',rarity:'SR',variant:'standard',weight:standardSR})
  return profileProposalSchema.parse({status:'proposal',setCode,source:'Proposition interne Mugiwara, taux non officiels, validation requise avant production',base,outcomes,omittedBonusPools})
}

export function expandProfile(input: unknown): BoosterRules {
  const proposal = profileProposalSchema.parse(input)
  const slot = (rarity: string, kind: z.infer<typeof variant>) => ({choices:[{rarity,variant:kind,weight:1}]})
  const packProfiles = proposal.outcomes.map(outcome => ({label:outcome.label,weight:outcome.weight,special:false,
    slots:[...proposal.base.flatMap(part=>Array.from({length:part.count},()=>slot(part.rarity,part.variant))),slot(outcome.rarity,outcome.variant)]}))
  return rulesSchema.parse({version:1,label:`Simulation contrôlée · ${proposal.setCode}`,source:proposal.source,
    selection:'number',variantPolicy:'metadata',slots:packProfiles[0].slots,packProfiles,specialPacks:[]})
}
