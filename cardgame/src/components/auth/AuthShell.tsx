'use client'
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { BookOpen, PackageOpen, Swords, Sparkles } from 'lucide-react'
import { useRemote } from '@/hooks/useRemote'
import { OceanBackdrop } from '@/components/home/fx'

type Showcase = { rares: { id: string; name: string; imageUrl: string }[]; stats: { cards: number; boosters: number; starterDecks: number } }

/** V2 sign-in / sign-up frame: an illustrated panel with rare cards from the catalogue beside a glass form card. */
export default function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  const showcase = useRemote<Showcase>('/api/home/showcase')
  const rares = showcase.data?.rares ?? [], stats = showcase.data?.stats
  return <div className="au">
    <OceanBackdrop />
    <section className="au-art" aria-hidden="true">
      <Image src="/images/banniere.png" alt="" fill priority sizes="50vw" className="au-art-bg" />
      <div className="au-art-copy">
        <Link href="/home" className="au-brand" tabIndex={-1}><Sparkles size={16} /> MUGIWARA TCG</Link>
        <h2>Deviens le Roi<br />des Pirates !</h2>
        <ul className="au-perks">
          <li><PackageOpen size={18} />{stats ? `${stats.boosters} extensions` : 'Des boosters'} à ouvrir gratuitement</li>
          <li><BookOpen size={18} />{stats ? `${stats.cards.toLocaleString('fr-FR')} cartes` : 'Des milliers de cartes'} à collectionner</li>
          <li><Swords size={18} />{stats ? `${stats.starterDecks} Starter Decks` : 'Les Starter Decks'} jouables contre le bot</li>
        </ul>
      </div>
      {rares.length >= 3 && <div className="au-fan">{[rares[1], rares[0], rares[2]].map((c, i) => <div key={c.id} className={`au-card c${i}`}><Image src={c.imageUrl} alt="" fill sizes="200px" /></div>)}</div>}
    </section>
    <section className="au-panel">
      <div className="au-card-form">
        <Link href="/home" className="au-back">← Retour à l’accueil</Link>
        <h1>{title}</h1>
        <p className="au-subtitle">{subtitle}</p>
        {children}
        <div className="au-footer">{footer}</div>
      </div>
      <p className="au-legal">Projet de fans non officiel · Simulation gratuite · Aucun achat.</p>
    </section>
  </div>
}

export function GoogleIcon() {
  return <svg className="au-google" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
}
