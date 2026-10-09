import { normalizeCardColors } from '../cardColors'
import type { CatalogueCard } from './types'
export type DeckEntry = CatalogueCard & { quantity: number }
export function additionError(card: CatalogueCard, entries: DeckEntry[], owned: number): string | null {
  const leader = entries.find(c=>c.type.toUpperCase()==='LEADER')
  const existing = entries.find(c=>c.id===card.id)?.quantity || 0
  if (existing >= owned) return 'Vous ne possédez pas assez d’exemplaires de cette carte.'
  if (card.type.toUpperCase()==='LEADER') return leader ? 'Retirez le leader actuel avant d’en choisir un autre.' : null
  if (!leader) return 'Choisissez d’abord votre leader.'
  if (!['CHARACTER','EVENT','STAGE'].includes(card.type.toUpperCase())) return 'Ce type de carte ne peut pas être ajouté au deck.'
  const allowed = normalizeCardColors(leader.color)
  const colors = normalizeCardColors(card.color)
  if (!colors.length || colors.some(c=>!allowed.includes(c))) return 'Cette couleur est incompatible avec votre leader.'
  if (entries.filter(c=>c.type.toUpperCase()!=='LEADER').reduce((n,c)=>n+c.quantity,0)>=50) return 'Le deck contient déjà 50 cartes.'
  const code = card.code.replace(/_p\d+$/i,'')
  if (entries.filter(c=>c.code.replace(/_p\d+$/i,'')===code).reduce((n,c)=>n+c.quantity,0)>=4) return 'Maximum 4 exemplaires par numéro, variantes comprises.'
  return null
}
export function deckAnalytics(entries: DeckEntry[]) {
  const main = entries.filter(c=>c.type.toUpperCase()!=='LEADER')
  const costs = Array.from({length:11},(_,cost)=>main.filter(c=>Math.min(c.cost || 0,10)===cost).reduce((n,c)=>n+c.quantity,0))
  const types: Record<string,number> = {}
  const colors: Record<string,number> = {}
  for (const card of main) {
    types[card.type]=(types[card.type] || 0)+card.quantity
    for (const color of normalizeCardColors(card.color)) colors[color]=(colors[color] || 0)+card.quantity
  }
  return { count:main.reduce((n,c)=>n+c.quantity,0),costs,types,colors }
}
