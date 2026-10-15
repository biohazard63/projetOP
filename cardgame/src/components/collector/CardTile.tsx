'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Heart } from 'lucide-react'
import type { CatalogueCard } from '@/lib/collector/types'
import { cardEffect } from '@/lib/collector/effects'
export default function CardTile({ card, onClick, missing = false, isNew = false, index = 0, priority = false }: { card: CatalogueCard; onClick: () => void; missing?: boolean; isNew?: boolean; index?: number; priority?: boolean }) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  // --i staggers the entrance of each new batch; the first rows load first.
  return <button type="button" className="piece-card" style={{ '--i': index } as React.CSSProperties} onClick={onClick} aria-label={`Carte ${card.name}, ${card.code}${missing ? ', manquante' : ''}`}
    onPointerMove={e => { if (e.pointerType !== 'mouse') return; const box = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mx', `${((e.clientX - box.left) / box.width) * 100}%`); e.currentTarget.style.setProperty('--my', `${((e.clientY - box.top) / box.height) * 100}%`) }}>
    <div className={`piece-card-image ${missing ? 'missing' : ''}${loaded ? ' loaded' : ''}`} data-effect={cardEffect(card)}>
      {/* Shown until the artwork arrives: never an empty frame. */}
      <span className="piece-card-placeholder" aria-hidden="true"><b>{card.name}</b><small>{card.code}</small></span>
      <Image src={!failed && card.imageUrl ? card.imageUrl : '/images/card-back.jpg'} alt={card.name} fill sizes="(max-width:640px) 42vw, (max-width:950px) 22vw, 190px" priority={priority} onLoad={() => setLoaded(true)} onError={() => { setFailed(true); setLoaded(true) }} />
      <span className="piece-card-rarity">{card.rarity}</span>{isNew && <span className="piece-card-new">Nouvelle</span>}
      {(card.quantity || 0) > 0 && <span className="piece-card-quantity">×{card.quantity}</span>}
      {card.isFavorite && <Heart className="absolute bottom-2 left-2 fill-rose-400 text-rose-400" size={16} />}
      {missing && <span className="piece-card-missing"><b>?</b>À découvrir</span>}
    </div><span className="piece-card-label">{card.name}</span><span className="piece-card-code"><span>{card.code}</span><span>{card.isAltArt ? 'ALT ART' : card.isParallel ? 'PARALLÈLE' : card.isSpecial ? 'SPÉCIALE' : card.type === 'LEADER' ? 'LEADER' : ''}</span></span>
  </button>
}
