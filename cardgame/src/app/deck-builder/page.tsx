'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useRemote } from '@/hooks/useRemote'
import type { CatalogueCard, CollectorDeck } from '@/lib/collector/types'
import { additionError, deckAnalytics, type DeckEntry } from '@/lib/collector/decks'
import { deckInput, validateDeck } from '@/lib/deckValidation'
import { normalizeCardColors } from '@/lib/cardColors'
import { PageHeading, LoadState, EmptyState } from '@/components/collector/Primitives'
import CardTile from '@/components/collector/CardTile'
import CardDetail from '@/components/collector/CardDetail'
export default function DeckBuilderPage() {
  const params=useSearchParams()
  const router=useRouter()
  const deckId=params.get('deckId')
  const owned=useRemote<{cards:CatalogueCard[]}>('/api/collection')
  const user=useRemote<{favorites:{cardId:string}[]}>('/api/user/cards')
  const saved=useRemote<CollectorDeck>(deckId ? `/api/decks/${encodeURIComponent(deckId)}` : null)
  const [entries,setEntries]=useState<DeckEntry[]>([])
  const [name,setName]=useState('')
  const [search,setSearch]=useState('')
  const [type,setType]=useState('')
  const [set,setSet]=useState('')
  const [rarity,setRarity]=useState('')
  const [favorites,setFavorites]=useState(false)
  const [compatible,setCompatible]=useState(false)
  const [page,setPage]=useState(1)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const lock=useRef(false)
  const [detail,setDetail]=useState<CatalogueCard|null>(null)
  useEffect(()=>{if(saved.data){setEntries(saved.data.cards);setName(saved.data.name)}},[saved.data])
  useEffect(()=>{setSearch(params.get('cardId') ? owned.data?.cards.find(c=>c.id===params.get('cardId'))?.code || '' : '')},[params,owned.data])
  useEffect(()=>setPage(1),[search,type,set,rarity,favorites,compatible])
  const leader=entries.find(c=>c.type.toUpperCase()==='LEADER')
  const favoriteIds=useMemo(()=>new Set(user.data?.favorites.map(c=>c.cardId)),[user.data])
  const catalogue=(owned.data?.cards || []).filter(c=>(!search || `${c.name} ${c.code}`.toLowerCase().includes(search.toLowerCase())) && (!type || c.type===type) && (!set || (c.setCode || c.set)===set) && (!rarity || c.rarity===rarity) && (!favorites || favoriteIds.has(c.id)) && (!compatible || !leader || c.type==='LEADER' || normalizeCardColors(c.color).every(color=>normalizeCardColors(leader.color).includes(color))))
  const stats=deckAnalytics(entries)
  const validation=validateDeck(entries.map(c=>({id:c.id,quantity:c.quantity})),entries)
  const missingOwnership=entries.some(c=>c.quantity>(owned.data?.cards.find(o=>o.id===c.id)?.quantity || 0))
  const pageCount=Math.max(1,Math.ceil(catalogue.length/12))
  const current=Math.min(page,pageCount)
  const values=(key:'type'|'setCode'|'rarity')=>[...new Set(owned.data?.cards.map(c=>key==='setCode'?c.setCode || c.set:c[key]).filter((s):s is string=>Boolean(s)))].sort()
  function add(card:CatalogueCard) {
    const reason=additionError(card,entries,owned.data?.cards.find(c=>c.id===card.id)?.quantity || 0)
    if(reason){setError(reason);return}
    setError('');setEntries(old=>old.some(c=>c.id===card.id)?old.map(c=>c.id===card.id?{...c,quantity:c.quantity+1}:c):[...old,{...card,quantity:1}])
  }
  function remove(id:string) {setError('');setEntries(old=>old.flatMap(c=>c.id!==id?[c]:c.quantity>1?[{...c,quantity:c.quantity-1}]:[]))}
  async function save() {
    if(lock.current) return
    const parsed=deckInput.safeParse({name,cards:entries.map(c=>({id:c.id,quantity:c.quantity}))})
    if(!parsed.success){setError('Choisissez un nom de 1 à 100 caractères et un deck complet.');return}
    if(validation || missingOwnership){setError(validation || 'Ce deck contient plus d’exemplaires que votre collection.');return}
    lock.current=true;setBusy(true);setError('')
    try {
      const response=await fetch(deckId?`/api/decks/${encodeURIComponent(deckId)}`:'/api/decks',{method:deckId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(parsed.data)})
      const data=await response.json();if(!response.ok)throw new Error(data.error || 'Sauvegarde impossible')
      router.push('/decks')
    } catch(e){setError(e instanceof Error?e.message:'Sauvegarde impossible')} finally{lock.current=false;setBusy(false)}
  }
  return <div className="piece-page"><PageHeading eyebrow="Votre équipage, votre stratégie" title={deckId?'Affinez votre deck.':'Construisez votre équipage.'} description="Un leader. Cinquante cartes. Une aventure qui vous ressemble."><Link href="/decks" className="piece-button secondary">Mes decks</Link><button className="piece-button" onClick={()=>void save()} disabled={busy || owned.loading || saved.loading}>{busy?'Sauvegarde…':'Sauvegarder'}</button></PageHeading>
  <LoadState loading={owned.loading || saved.loading || user.loading} error={owned.error || saved.error || user.error} retry={()=>{owned.retry();saved.retry();user.retry()}} />{error && <p className="piece-error" role="alert">{error}</p>}
  <div className="piece-builder"><section className="piece-panel"><h2>Votre catalogue</h2><p className="piece-muted mt-2">Cartes de votre collection uniquement.</p><div className="piece-toolbar"><label className="piece-field search">Recherche<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nom ou identifiant…" /></label>{(['type','setCode','rarity'] as const).map(key=><label key={key} className="piece-field">{key==='type'?'Type':key==='setCode'?'Extension':'Rareté'}<select value={key==='type'?type:key==='setCode'?set:rarity} onChange={e=>(key==='type'?setType:key==='setCode'?setSet:setRarity)(e.target.value)}><option value="">Tous</option>{values(key).map(v=><option key={v}>{v}</option>)}</select></label>)}</div><div className="mb-4"><label className="piece-checkbox"><input type="checkbox" checked={favorites} onChange={e=>setFavorites(e.target.checked)} />Mes favoris</label><label className="piece-checkbox"><input type="checkbox" checked={compatible} onChange={e=>setCompatible(e.target.checked)} />Couleurs du leader</label></div>
  <div className="piece-builder-catalog">{catalogue.slice((current-1)*12,current*12).map(card=><div key={card.id}><CardTile card={card} onClick={()=>setDetail(card)} /><button className="piece-button secondary w-full mt-2 !px-1 !text-xs" disabled={busy} onClick={()=>add(card)}>{card.type==='LEADER'?'Choisir':'Ajouter'}</button></div>)}</div>{!owned.loading && !catalogue.length && <EmptyState title="Aucune carte disponible" description="Ouvrez un booster ou adaptez vos filtres." />}
  {pageCount>1 && <div className="piece-pagination"><button aria-label="Catalogue précédent" className="piece-button secondary !px-3" disabled={current===1} onClick={()=>setPage(current-1)}>←</button><span>{current}/{pageCount}</span><button aria-label="Catalogue suivant" className="piece-button secondary !px-3" disabled={current===pageCount} onClick={()=>setPage(current+1)}>→</button></div>}</section>
  <section className="piece-panel"><h2>Votre deck</h2><label className="piece-field mt-5">Nom du deck<input maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="L’équipage du Chapeau de Paille" /></label><div className="piece-results"><span>Leader : {leader?1:0}/1</span><strong className="text-amber-200">{stats.count}/50 cartes</strong></div>
  {entries.length?entries.map(card=><div className="piece-deck-entry" key={card.id}><button aria-label={`Détails de ${card.name}`} onClick={()=>setDetail(card)}><Image src={card.imageUrl} alt={card.name} width={38} height={53} /></button><div className="piece-deck-entry-title"><strong>{card.name}</strong><span>{card.code} · {card.type==='LEADER'?'LEADER':`${card.cost} DON!!`}</span></div><div className="piece-stepper"><button disabled={busy} aria-label={`Retirer ${card.name}`} onClick={()=>remove(card.id)}>−</button><span>{card.quantity}</span><button disabled={busy} aria-label={`Ajouter ${card.name}`} onClick={()=>add(card)}>+</button></div></div>):<EmptyState title="Votre leader vous attend" description="Choisissez un leader dans le catalogue pour commencer." />}</section>
  <aside className="piece-panel piece-builder-stats"><h2>Le cap du deck</h2><p role="status" className={`piece-muted mt-4 ${validation?'':'!text-emerald-300'}`}>{validation || 'Règles de base respectées.'}</p>{missingOwnership && <p className="piece-muted !text-amber-200">Certains exemplaires manquent à votre collection.</p>}<p className="piece-muted mt-3 !text-xs">Banlist et règles spéciales non contrôlées. La validation serveur vérifie les cartes, les couleurs et les quantités ; la disponibilité dans la collection est contrôlée dans cette interface.</p>
  <h3 className="text-sm font-medium mt-6">Courbe des coûts</h3><div className="piece-cost-chart" aria-label="Répartition par coût">{stats.costs.map((n,i)=><div className="piece-cost-column" key={i}><span>{n || ''}</span><div style={{height:`${n/Math.max(1,...stats.costs)*70}px`}} /><span>{i===10?'10+':i}</span></div>)}</div>
  <h3 className="text-sm mt-6">Types</h3>{Object.entries(stats.types).map(([t,n])=><p key={t} className="piece-results !my-3"><span>{t}</span><span>{n}</span></p>)}<h3 className="text-sm mt-6">Couleurs</h3>{Object.entries(stats.colors).map(([c,n])=><p key={c} className="piece-results !my-3"><span>{c}</span><span>{n}</span></p>)}<button className="piece-button w-full mt-6" onClick={()=>void save()} disabled={busy || Boolean(validation) || missingOwnership || !name.trim() || owned.loading || saved.loading}>{busy?'Sauvegarde…':'Sauvegarder le deck'}</button></aside></div><CardDetail card={detail ? {...detail,quantity:owned.data?.cards.find(c=>c.id===detail.id)?.quantity || 0}:null} cards={owned.data?.cards} onClose={()=>setDetail(null)} /></div>
}
