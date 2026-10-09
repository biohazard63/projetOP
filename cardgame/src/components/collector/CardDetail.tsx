'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { CatalogueCard } from '@/lib/collector/types'
export default function CardDetail({ card, cards = [], onClose, onFavorite, authenticated = true }: { card: CatalogueCard | null; cards?: CatalogueCard[]; onClose: () => void; onFavorite?: (id: string) => Promise<void>; authenticated?: boolean }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const variants = card ? cards.filter(c => c.id !== card.id && c.code.replace(/_p\d+$/i, '') === card.code.replace(/_p\d+$/i, '')) : []
  return <Dialog open={Boolean(card)} onOpenChange={open => { if (!open) { onClose(); setError('') } }}><DialogContent className="piece-modal">
    {card && <><DialogTitle>{card.name}</DialogTitle><DialogDescription>{card.code} · {card.setCode || card.set} · {card.rarity}</DialogDescription><div className="piece-card-detail">
      <div className="piece-card-detail-art"><Image src={card.imageUrl || '/images/card-back.jpg'} alt={card.name} fill sizes="(max-width:640px) 60vw, 400px" /></div>
      <div><p className="piece-eyebrow">{card.isAltArt ? 'Illustration alternative' : card.isParallel ? 'Version parallèle' : card.isSpecial ? 'Édition spéciale' : 'Dans le catalogue'}</p>
        <dl className="piece-card-facts">{[['Extension', card.setCode || card.set], ['Rareté', card.rarity], ['Couleur', card.color], ['Type', card.type], ['Coût', card.cost], ['Puissance', card.power], ['Contre', card.counter], ['Attribut', card.attribute], ['Famille', card.family], ['Possédées', authenticated ? card.quantity || 0 : 'Connectez-vous']].filter(([, v]) => v !== null && v !== undefined).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        {card.effect && <p className="piece-effect-text">{card.effect}</p>}{card.ability && <p className="piece-effect-text">{card.ability}</p>}{card.trigger && <p className="piece-effect-text"><strong className="text-amber-200">Trigger · </strong>{card.trigger}</p>}{card.notes && <p className="piece-effect-text">{card.notes}</p>}
        {variants.length > 0 && <p className="piece-muted">Autres variantes du catalogue : {variants.map(c => c.code).join(', ')}</p>}
        <div className="piece-actions mt-6">{authenticated && (card.quantity || 0) > 0 && ['LEADER','CHARACTER','EVENT','STAGE'].includes(card.type.toUpperCase()) && <Link href={`/deck-builder?cardId=${encodeURIComponent(card.id)}`} className="piece-button">Ajouter à un deck</Link>}
          {onFavorite && <button className="piece-button secondary" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await onFavorite(card.id) } catch { setError('Modification des favoris impossible') } finally { setBusy(false) } }}>{card.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</button>}</div>{error && <p role="alert" className="piece-error">{error}</p>}
      </div></div></>}
  </DialogContent></Dialog>
}
