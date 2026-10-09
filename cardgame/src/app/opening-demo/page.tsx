'use client'
import { useState } from 'react'
import Link from 'next/link'
import { getBoosterArtwork } from '@/lib/boosters/artwork'
import type { CatalogueCard } from '@/lib/collector/types'
import { PageHeading } from '@/components/collector/Primitives'
import CinematicOpening from '@/components/booster-opening/CinematicOpening'
import BoosterArtwork from '@/components/booster-opening/BoosterArtwork'
import CardTile from '@/components/collector/CardTile'
import CardDetail from '@/components/collector/CardDetail'
const cards:CatalogueCard[]=['C','R','SR','SEC','SR'].map((rarity,i)=>({id:`demo-${i}`,code:`DEMO-${i+1}`,name:`Carte de démonstration ${i+1}`,type:'CHARACTER',color:'BLUE',cost:1,power:null,counter:null,rarity,imageUrl:i%2?'/images/OP09-093.webp':'/images/OP05-119.webp',set:'Démonstration',setCode:'DEMO',effect:null,trigger:null,ability:null,attribute:null,family:null,isAltArt:i===4,isParallel:false,isSpecial:false}))
export default function OpeningDemoPage() {
  const [code,setCode]=useState('OP01')
  const [active,setActive]=useState(false)
  const [done,setDone]=useState(false)
  const [revealed,setRevealed]=useState(0)
  const [detail,setDetail]=useState<CatalogueCard|null>(null)
  return <div className="piece-page"><PageHeading eyebrow="Atelier cinématique" title="L’émotion de la découverte." description="Démonstration visuelle avec des cartes de test. Aucun tirage, aucune attribution, aucune écriture dans votre collection."><Link href="/boosters" className="piece-button secondary">Retour aux boosters</Link></PageHeading><div className="piece-panel"><label className="piece-field !max-w-xs mb-6">Illustration du paquet<select value={code} disabled={active} onChange={e=>{setCode(e.target.value);setDone(false)}}>{['OP01','OP09','OP12'].map(c=><option key={c}>{c}</option>)}</select></label>
  {active?<CinematicOpening imageUrl={getBoosterArtwork(code,null)} setName={code} cardCount={cards.length} onComplete={()=>{setActive(false);setDone(true)}} />:!done?<div className="text-center py-8"><BoosterArtwork key={code} src={getBoosterArtwork(code,null)} alt={`Démonstration ${code}`} /><button className="piece-button mt-6" onClick={()=>{setActive(true);setRevealed(0)}}>Lancer la démonstration</button></div>:<><div className="piece-actions mb-6"><button className="piece-button" onClick={()=>setRevealed(cards.length)}>Tout révéler</button><button className="piece-button secondary" onClick={()=>setRevealed(n=>Math.min(n+1,cards.length))} disabled={revealed===cards.length}>Carte suivante</button><button className="piece-button ghost" onClick={()=>{setActive(true);setRevealed(0)}}>Rejouer la cinématique</button></div><div className="piece-card-grid">{cards.map((card,i)=><div key={card.id} className="piece-reveal" data-revealed={i<revealed}>{i<revealed?<CardTile card={card} onClick={()=>setDetail(card)} />:<CardTile card={{...card,imageUrl:'/images/card-back.jpg',name:'Carte à découvrir',rarity:'?'}} onClick={()=>setRevealed(i+1)} />}</div>)}</div><p className="piece-muted mt-6">Cartes de démonstration uniquement · Les cinq niveaux d’effets sont des styles visuels, pas des probabilités de tirage.</p></>}
  </div><CardDetail card={detail} authenticated={false} onClose={()=>setDetail(null)} /></div>
}
