'use client'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { CatalogueCard } from '@/lib/collector/types'
import { normalizeCardColors } from '@/lib/cardColors'
import CardTile from './CardTile'
import CardDetail from './CardDetail'
import { EmptyState } from './Primitives'
import { useCollectorPreferences } from './Preferences'
const colors = { RED:'Rouge', BLUE:'Bleu', GREEN:'Vert', PURPLE:'Violet', BLACK:'Noir', YELLOW:'Jaune' }
export default function CatalogueGrid({ cards, authenticated = true, collection = false, onFavorite }: { cards: CatalogueCard[]; authenticated?: boolean; collection?: boolean; onFavorite?: (id: string) => Promise<void> }) {
  const preferences = useCollectorPreferences()
  const query = useSearchParams().get('q') || ''
  const [search, setSearch] = useState(query)
  useEffect(() => setSearch(query), [query])
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const deferredSearch = useDeferredValue(search.trim().toLowerCase())
  const [set, setSet] = useState('')
  const [rarity, setRarity] = useState('')
  const [color, setColor] = useState('')
  const [type, setType] = useState('')
  const [ownership, setOwnership] = useState(collection ? 'owned' : 'all')
  const [sort, setSort] = useState('code')
  const [favorites, setFavorites] = useState(false)
  const [alternatives, setAlternatives] = useState(false)
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState<string | null>(null)
  const filtered = useMemo(() => cards.filter(card =>
    (!deferredSearch || `${card.name} ${card.code}`.toLowerCase().includes(deferredSearch)) &&
    (!set || (card.setCode || card.set) === set) && (!rarity || card.rarity === rarity) &&
    (!color || normalizeCardColors(card.color).includes(color)) && (!type || card.type === type) &&
    (ownership !== 'owned' || (card.quantity || 0) > 0) && (ownership !== 'missing' || !(card.quantity || 0)) &&
    (!favorites || card.isFavorite) && (!alternatives || card.isAltArt || card.isParallel || card.isSpecial)
  ).sort((a,b) => sort === 'quantity' ? (b.quantity || 0) - (a.quantity || 0) || a.code.localeCompare(b.code) : sort === 'cost' ? (a.cost || 0) - (b.cost || 0) : sort === 'cost-desc' ? (b.cost || 0) - (a.cost || 0) : sort === 'power' ? (a.power || 0) - (b.power || 0) : sort === 'power-desc' ? (b.power || 0) - (a.power || 0) : sort === 'set' ? (a.setCode || a.set || '').localeCompare(b.setCode || b.set || '') : sort === 'set-desc' ? (b.setCode || b.set || '').localeCompare(a.setCode || a.set || '') : sort === 'name-desc' ? b.name.localeCompare(a.name,'fr') : sort === 'name' ? a.name.localeCompare(b.name,'fr') : a.code.localeCompare(b.code,undefined,{numeric:true})), [cards, deferredSearch, set, rarity, color, type, ownership, sort, favorites, alternatives])
  useEffect(() => setPage(1), [deferredSearch,set,rarity,color,type,ownership,sort,favorites,alternatives])
  const pages = Math.max(1,Math.ceil(filtered.length / 36))
  const current = Math.min(page,pages)
  const values = (key: 'setCode'|'rarity'|'type') => [...new Set(cards.map(c => key === 'setCode' ? c.setCode || c.set : c[key]).filter((s): s is string => Boolean(s)))].sort()
  const selected = cards.find(c => c.id === detailId) || null
  function reset() { setSearch(''); setSet(''); setRarity(''); setColor(''); setType(''); setFavorites(false); setAlternatives(false); setOwnership(collection ? 'owned' : 'all') }
  const facetCards = cards.filter(card => ownership === 'owned' ? (card.quantity || 0)>0 : ownership === 'missing' ? !(card.quantity || 0) : true)
  const facets = [
    { label: 'Extension', state: set, update: setSet, choices: values('setCode').map(v=>[v,v]), matches:(card:CatalogueCard,v:string)=>(card.setCode || card.set)===v },
    { label: 'Rareté', state: rarity, update: setRarity, choices: values('rarity').map(v=>[v,v]), matches:(card:CatalogueCard,v:string)=>card.rarity===v },
    { label: 'Couleur', state: color, update: setColor, choices: Object.entries(colors), matches:(card:CatalogueCard,v:string)=>normalizeCardColors(card.color).includes(v) },
    { label: 'Type', state: type, update: setType, choices: values('type').map(v=>[v,v]), matches:(card:CatalogueCard,v:string)=>card.type===v },
  ]
  return <><div className="piece-binder"><details className="piece-binder-filters" open><summary>Filtres</summary><div className="piece-filter-heading mt-4"><span className="piece-muted !text-xs">Affiner le classeur</span><button onClick={reset}>Réinitialiser</button></div>
    <label className="piece-field">Rechercher<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nom ou identifiant…" /></label>
    {facets.map(facet=><fieldset key={facet.label}><legend>{facet.label}</legend><div className="piece-filter-list"><label><input type="radio" name={`filter-${facet.label}`} checked={!facet.state} onChange={()=>facet.update('')} />Tous<span>{facetCards.length}</span></label>{facet.choices.map(([value,label])=><label key={value}><input type="radio" name={`filter-${facet.label}`} checked={facet.state===value} onChange={()=>facet.update(value)} /><span>{label}</span><span>{facetCards.filter(card=>facet.matches(card,value)).length}</span></label>)}</div></fieldset>)}
    {onFavorite && <label className="piece-checkbox !text-xs mt-3"><input type="checkbox" checked={favorites} onChange={e=>setFavorites(e.target.checked)} />Mes favoris</label>}<label className="piece-checkbox !text-xs"><input type="checkbox" checked={alternatives} onChange={e=>setAlternatives(e.target.checked)} />Variantes spéciales</label>
  </details><section className="piece-binder-content" aria-label="Cartes de la collection"><div className="piece-results"><div><h2>{collection?'Ma collection':'Cartes du catalogue'}</h2><p className="piece-muted !text-xs" aria-live="polite">{filtered.length} cartes uniques affichées</p></div><div className="piece-actions"><div className="piece-view-toggle"><button aria-pressed={view==='grid'} onClick={()=>setView('grid')}>Grille</button><button aria-pressed={view==='list'} onClick={()=>setView('list')}>Liste</button></div>{authenticated && <label className="piece-field">Afficher<select aria-label="Afficher" value={ownership} onChange={e=>setOwnership(e.target.value)}><option value="owned">Possédées</option><option value="all">Tout le classeur</option><option value="missing">Manquantes</option></select></label>}<label className="piece-field">Trier<select aria-label="Trier" value={sort} onChange={e=>setSort(e.target.value)}><option value="code">Identifiant</option><option value="name">Nom A–Z</option><option value="name-desc">Nom Z–A</option><option value="cost">Coût croissant</option><option value="cost-desc">Coût décroissant</option><option value="power">Puissance croissante</option><option value="power-desc">Puissance décroissante</option><option value="set">Extension A–Z</option><option value="set-desc">Extension Z–A</option>{authenticated && <option value="quantity">Quantité décroissante</option>}</select></label></div></div>
    {filtered.length ? <div className={`piece-card-grid ${view === 'list' ? 'list' : ''} ${preferences.density === 'compact' ? 'compact' : ''}`}>{filtered.slice((current-1)*36,current*36).map(card => <CardTile key={card.id} card={card} missing={authenticated && !(card.quantity || 0)} isNew={Boolean(card.acquiredAt && Date.now()-new Date(card.acquiredAt).getTime()<7*86400000)} onClick={()=>setDetailId(card.id)} />)}</div> : <EmptyState title="Aucune carte à cet horizon" description="Changez les filtres ou ouvrez un booster pour enrichir votre classeur." />}
    {pages > 1 && <div className="piece-pagination"><button className="piece-button secondary" disabled={current === 1} onClick={()=>setPage(current-1)}>Précédent</button><span>{current} / {pages}</span><button className="piece-button secondary" disabled={current===pages} onClick={()=>setPage(current+1)}>Suivant</button></div>}
    </section></div>
    <CardDetail card={selected} cards={cards} authenticated={authenticated} onClose={()=>setDetailId(null)} onFavorite={onFavorite} />
  </>
}
