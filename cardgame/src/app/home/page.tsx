'use client'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { BookOpen, Layers, PackageOpen, ArrowRight, CircleGauge } from 'lucide-react'
import { useRemote } from '@/hooks/useRemote'
import type { CollectorOverview, CatalogueCard, HistoryPage } from '@/lib/collector/types'
import type { BoosterCatalogItem } from '@/lib/boosters/types'
import { useState } from 'react'
import { LoadState, SectionHeading, EmptyState } from '@/components/collector/Primitives'
import SetTile from '@/components/collector/SetTile'
import CardTile from '@/components/collector/CardTile'
import CardDetail from '@/components/collector/CardDetail'
export default function HomePage() {
  const { data: session, status } = useSession()
  const overview = useRemote<CollectorOverview>(session?.user?.id ? '/api/collector' : null)
  const catalogue = useRemote<{ sets: BoosterCatalogItem[] }>(session?.user?.id ? '/api/booster' : null)
  const history = useRemote<HistoryPage>(session?.user?.id ? '/api/booster/history' : null)
  const [detail, setDetail] = useState<CatalogueCard | null>(null)
  const stats = overview.data
  const extensions = catalogue.data?.sets.filter(s => s.available).slice(0, 4) || []
  const progressSets = stats?.sets.filter(s => s.total > 0).sort((a, b) => b.unique - a.unique).slice(0, 4) || []
  return <div className="piece-page piece-home-page">
    <section className="piece-hero"><div className="piece-hero-art"><Image src="/images/banniere.png" alt="Luffy et l’équipage du Chapeau de Paille" fill priority sizes="(max-width:640px) 100vw, 800px" /></div><div className="piece-hero-copy"><p className="piece-eyebrow">{session?.user?.name ? `Bienvenue, ${session.user.name.split(' ')[0]}` : 'Votre aventure commence ici'}</p><h1>Deviens le Roi<br />des Pirates !</h1><p className="piece-muted">Ouvre des boosters, complète ta collection<br className="hidden sm:block" /> et crée un équipage légendaire.</p><div className="piece-actions"><Link href="/boosters" className="piece-button"><PackageOpen size={17} />Ouvrir un booster</Link><Link href="/collection" className="piece-button secondary"><BookOpen size={16} />Voir ma collection</Link></div></div></section>
    <LoadState loading={status === 'loading' || overview.loading} error={overview.error} retry={overview.retry} />
    {stats && <section className="piece-stats" aria-label="Statistiques de collection"><div className="piece-stat piece-stat-collection"><div><strong>{stats.unique}<span> / {stats.catalogue}</span></strong><small>Cartes uniques · {stats.total} exemplaires</small></div><span className="piece-progress-ring" style={{background:`conic-gradient(#3B82F6 ${stats.percentage*3.6}deg, #163049 0deg)`}}><span>{stats.percentage}%</span></span></div>{[
      { title: 'Decks créés', value: stats.decks, icon: Layers },
      { title: 'Boosters ouverts', value: stats.openings, icon: PackageOpen },
      { title: 'Extensions disponibles', value: catalogue.data?.sets.filter(s=>s.available).length ?? '…', icon: CircleGauge },
    ].map(({ title, value, icon: Icon }) => <div className="piece-stat" data-stat={title === 'Boosters ouverts' ? 'openings' : 'other'} key={title}><div className="piece-stat-top"><Icon size={16} /></div><strong>{value}</strong><small>{title}</small></div>)}</section>}
    {stats?.lastOpening && <p className="piece-last-opening">Dernière ouverture : <Link href={`/history?opening=${stats.lastOpening.id}`}>{stats.lastOpening.setName}</Link> · {new Date(stats.lastOpening.openedAt).toLocaleString('fr-FR')}</p>}
    {stats && <><SectionHeading title="Dernières cartes obtenues" href="/history" />{stats.recentCards.length ? <div className="piece-recent-strip">{stats.recentCards.map(card=><CardTile key={card.id} card={card} onClick={()=>setDetail(card)} />)}</div> : <EmptyState title="Votre première découverte vous attend" description="Ouvrez un booster pour commencer votre collection." />}
    <SectionHeading title="Progression des extensions" href="/progress" /><div className="piece-extension-progress-grid">{progressSets.map(progress=>{const set=catalogue.data?.sets.find(s=>s.code===progress.code);return <Link href={`/boosters/${encodeURIComponent(progress.code)}`} key={progress.code} className="piece-extension-progress"><Image src={set?.imageUrl || '/images/ocean-bg.png'} alt="" fill sizes="(max-width:640px) 45vw, 250px" /><div><strong>{progress.code}</strong><span>{progress.percentage}%</span><small>{progress.unique} / {progress.total} cartes</small><div className="piece-progress"><span style={{width:`${progress.percentage}%`}} /></div></div></Link>})}</div></>}

    {stats && <Link href="/decks" className="piece-mobile-deck-link piece-button secondary"><Layers size={18}/>Retrouver mes {stats.decks} decks<ArrowRight size={16}/></Link>}
    {status === 'unauthenticated' && <p className="piece-panel piece-muted mt-6"><Link href="/login" className="text-amber-200">Connectez-vous</Link> pour retrouver vos cartes, votre progression et vos dernières découvertes.</p>}
    <section className="piece-home-next"><SectionHeading title="Votre prochaine escale" href="/boosters" label="Explorer les extensions" /><LoadState loading={catalogue.loading} error={catalogue.error} retry={catalogue.retry} /><div className="piece-set-grid">{extensions.map(set => <SetTile key={set.code} set={set} progress={stats?.sets.find(s => s.code === set.code)} authenticated={Boolean(session?.user)} />)}</div>
    {catalogue.data && !extensions.length && <EmptyState title="Aucun booster disponible" description="Le catalogue ne dispose pas encore de toutes les cartes nécessaires aux tirages configurés." />}
    </section>{stats && <>
    <div className="piece-two-columns piece-home-lower"><section><SectionHeading title="Dernières ouvertures" href="/history" /><LoadState loading={history.loading} error={history.error} retry={history.retry} /><div className="piece-history-list">{history.data?.openings.slice(0,3).map(row => <Link key={row.id} href={`/history?opening=${row.id}`} className="piece-history-row"><div><strong>{row.setName}</strong><p>{new Date(row.openedAt).toLocaleString('fr-FR')} · {row.cardCount} cartes</p></div><ArrowRight size={17} /></Link>)}</div>{history.data && !history.data.openings.length && <EmptyState title="Le début du voyage" description="Vos ouvertures seront conservées ici." />}</section>
    <section><SectionHeading title="Vos trésors rares" href="/collection" />{stats.recentRareCards.length ? <div className="piece-card-grid" style={{ gridTemplateColumns:'repeat(3,minmax(0,1fr))' }}>{stats.recentRareCards.slice(0,3).map(card => <CardTile key={card.id} card={card} onClick={() => setDetail(card)} />)}</div> : <EmptyState title="Les trésors se font désirer" description="Les cartes rares et spéciales de votre collection apparaîtront ici." />}</section></div></>}
    <CardDetail card={detail} cards={stats?.recentCards} onClose={() => setDetail(null)} />
  </div>
}
