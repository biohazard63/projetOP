'use client'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BookOpen, Layers, PackageOpen, Swords, UserPlus, Sparkles, Trophy } from 'lucide-react'
import { useRemote } from '@/hooks/useRemote'
import PackArt from '@/components/booster-opening/PackArt'
import { Counter } from '@/components/collector/Progression'
import { DailyTreasure, OceanBackdrop, Tilt, useReveal } from './fx'

type Showcase = { boosters: { code: string; title: string; imageUrl: string | null; cardCount: number; available: boolean }[]; rares: { id: string; code: string; name: string; rarity: string; imageUrl: string }[]; stats: { cards: number; boosters: number; starterDecks: number } }

function RareCard({ card, className, style }: { card: Showcase['rares'][number]; className?: string; style?: React.CSSProperties }) {
  return <div className={`hv-card${className ? ` ${className}` : ''}`} style={style}><Image src={card.imageUrl} alt={card.name} fill sizes="200px" draggable={false} /></div>
}

/** Home page for visitors: what the site offers, a glimpse of the cards and boosters, and an invitation to sign up. */
export default function VisitorHome() {
  useReveal()
  const showcase = useRemote<Showcase>('/api/home/showcase')
  const data = showcase.data, rares = data?.rares ?? []
  const features = [
    { icon: PackageOpen, title: 'Ouvre des boosters', text: `${data?.stats.boosters ?? 20} extensions, de ROMANCE DAWN aux dernières sorties. Déchire le paquet et découvre tes cartes une à une.` },
    { icon: BookOpen, title: 'Complète ta collection', text: `${(data?.stats.cards ?? 4074).toLocaleString('fr-FR')} cartes à réunir, illustrations alternatives comprises. Suis ta progression et gagne des rangs de pirate.` },
    { icon: Swords, title: 'Affronte le bot', text: `${data?.stats.starterDecks ?? 35} Starter Decks officiels jouables, trois niveaux de difficulté et un moteur qui applique les règles du jeu.` },
    { icon: Layers, title: 'Construis tes decks', text: 'Assemble tes cartes en decks, prépare tes stratégies et trouve l’équipage qui te ressemble.' },
  ]
  return <div className="fx-home hv">
    <OceanBackdrop />
    <section className="hv-hero">
      <div className="hv-hero-art"><Image src="/images/banniere.png" alt="Luffy et l’équipage du Chapeau de Paille" fill priority sizes="100vw" /></div>
      <div className="hv-hero-copy">
        <p className="hv-eyebrow"><Sparkles size={14} /> Simulateur gratuit · One Piece Card Game</p>
        <h1>Deviens le Roi<br />des Pirates !</h1>
        <p className="hv-lead">Ouvre des boosters, complète ta collection et affronte le bot avec les Starter Decks officiels. Gratuit, sans achat.</p>
        <div className="hv-actions">
          <Link href="/register" className="hv-primary"><UserPlus size={18} />Commencer l’aventure</Link>
          <Link href="/login" className="hv-secondary">J’ai déjà un compte <ArrowRight size={16} /></Link>
        </div>
      </div>
      {rares.length >= 3 && <div className="hv-fan" aria-hidden="true">
        <RareCard card={rares[1]} className="left" /><RareCard card={rares[2]} className="right" /><RareCard card={rares[0]} className="center" />
      </div>}
    </section>

    {rares.length > 0 && <section className="hv-marquee" aria-label="Quelques cartes rares du catalogue">
      <div className="hv-marquee-track">{[...rares, ...rares].map((card, i) => <RareCard key={`${card.id}-${i}`} card={card} />)}</div>
    </section>}

    <section className="hv-daily" data-reveal aria-label="Trésor du jour"><DailyTreasure /><div className="hv-daily-cta"><p>Imagine ce que cachent tes boosters…</p><Link href="/register" className="hv-primary"><UserPlus size={18} />Commencer l’aventure</Link></div></section>

    <section className="hv-section" aria-labelledby="hv-features" data-reveal>
      <p className="hv-kicker">L’aventure</p>
      <h2 id="hv-features">Tout pour vivre le jeu de cartes</h2>
      <div className="hv-features">{features.map(({ icon: Icon, title, text }, i) => <Tilt key={title} className={`hv-feature f${i}`}><span className="hv-feature-icon"><Icon size={22} /></span><h3>{title}</h3><p>{text}</p></Tilt>)}</div>
    </section>

    {data && <section className="hv-section" aria-labelledby="hv-boosters" data-reveal>
      <div className="hv-section-top"><div><p className="hv-kicker">Les extensions</p><h2 id="hv-boosters">Choisis ton prochain booster</h2></div><Link href="/register" className="hv-link">Ouvrir mon premier booster <ArrowRight size={16} /></Link></div>
      <div className="hv-boosters">{data.boosters.map(b => <Link key={b.code} href="/register" className="hv-booster" title={`${b.code} · ${b.title}`}>
        <PackArt src={b.imageUrl} alt={`Booster ${b.code}`} /><b>{b.code}</b><span>{b.title}</span></Link>)}</div>
    </section>}

    <section className="hv-section" aria-labelledby="hv-steps" data-reveal>
      <p className="hv-kicker">Comment ça marche</p>
      <h2 id="hv-steps">Trois étapes pour prendre la mer</h2>
      <ol className="hv-steps">
        <li><span>1</span><h3>Crée ton compte</h3><p>Gratuit, en quelques secondes, avec ton e-mail ou ton compte Google.</p></li>
        <li><span>2</span><h3>Ouvre tes boosters</h3><p>Chaque ouverture est enregistrée et tes cartes rejoignent ta collection.</p></li>
        <li><span>3</span><h3>Joue et progresse</h3><p>Affronte le bot, complète tes extensions et deviens Roi des pirates.</p></li>
      </ol>
    </section>

    {data && <section className="hv-figures" aria-label="Chiffres clés" data-reveal>
      <Counter label="cartes au catalogue" value={data.stats.cards} accent />
      <Counter label="extensions à ouvrir" value={data.stats.boosters} />
      <Counter label="Starter Decks jouables" value={data.stats.starterDecks} />
    </section>}

    <section className="hv-final" data-reveal>
      <Trophy size={36} />
      <h2>Ton équipage t’attend.</h2>
      <p>Rejoins l’aventure et ouvre ton premier booster dès maintenant.</p>
      <div className="hv-actions"><Link href="/register" className="hv-primary"><UserPlus size={18} />Créer mon compte</Link><Link href="/login" className="hv-secondary">Se connecter</Link></div>
      <small>Projet de fans non officiel · Simulation gratuite · Aucun achat. One Piece Card Game est une marque de Bandai.</small>
    </section>
  </div>
}
