'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Heart } from 'lucide-react'
import type { CatalogueCard } from '@/lib/collector/types'
import { cardEffect } from '@/lib/collector/effects'
export default function CardTile({ card, onClick, missing = false, isNew = false }: { card: CatalogueCard; onClick: () => void; missing?: boolean; isNew?: boolean }) {
  const [failed, setFailed] = useState(false)
  return <button type="button" className="piece-card" onClick={onClick} aria-label={`Carte ${card.name}, ${card.code}${missing ? ', manquante' : ''}`}>
    <div className={`piece-card-image ${missing ? 'missing' : ''}`} data-effect={cardEffect(card)}>
      <Image src={!failed && card.imageUrl ? card.imageUrl : '/images/card-back.jpg'} alt={card.name} fill sizes="(max-width:640px) 42vw, (max-width:950px) 22vw, 190px" onError={() => setFailed(true)} />
      <span className="piece-card-rarity">{card.rarity}</span>{isNew && <span className="piece-card-new">Nouvelle</span>}
      {(card.quantity || 0) > 0 && <span className="piece-card-quantity">×{card.quantity}</span>}
      {card.isFavorite && <Heart className="absolute bottom-2 left-2 fill-rose-400 text-rose-400" size={16} />}
      {missing && <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-300">À découvrir</span>}
    </div><span className="piece-card-label">{card.name}</span><span className="piece-card-code"><span>{card.code}</span><span>{card.isAltArt ? 'ALT ART' : card.isParallel ? 'PARALLÈLE' : card.isSpecial ? 'SPÉCIALE' : card.type === 'LEADER' ? 'LEADER' : ''}</span></span>
  </button>
}
