'use client'
import { useMemo, useState, type CSSProperties } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowRight, BookOpen, Layers, PackageOpen, PlayCircle, Sparkles, Swords, Trophy, Lock } from 'lucide-react'
import { useRemote } from '@/hooks/useRemote'
import type { CollectorOverview, CatalogueCard, HistoryPage } from '@/lib/collector/types'
import type { BoosterCatalogItem } from '@/lib/boosters/types'
import { LoadState, SectionHeading, EmptyState, Progress } from '@/components/collector/Primitives'
import CardTile from '@/components/collector/CardTile'
import CardDetail from '@/components/collector/CardDetail'
import PackArt from '@/components/booster-opening/PackArt'
import { Counter, Ring, rankOf, RANKS } from '@/components/collector/Progression'
import { boosterTitle } from '@/lib/boosters/catalogPresentation'
import { DailyTreasure, OceanBackdrop, Tilt, useReveal } from './fx'

type ActiveGame = { game: { gameId: string; status: string; projection: { turn: number } } | null }

/** Cosmetic achievements derived from the player's existing statistics (no new rule, no stored state). */
function badgesOf(stats: CollectorOverview) {
  return [
    { name: 'Premier booster', hint: 'Ouvrir un booster', done: stats.openings >= 1 },
    { name: 'Habitué des boosters', hint: '10 boosters ouverts', done: stats.openings >= 10 },
    { name: 'Grand explorateur', hint: '50 boosters ouverts', done: stats.openings >= 50 },
    { name: 'Stratège', hint: 'Créer un deck', done: stats.decks >= 1 },
    { name: 'Amiral de flotte', hint: '10 decks créés', done: stats.decks >= 10 },
    { name: 'Collectionneur', hint: '25 % du catalogue', done: stats.percentage >= 25 },
    { name: 'Archiviste', hint: '50 % du catalogue', done: stats.percentage >= 50 },
    { name: 'Chasseur d’alternatives', hint: '100 variantes spéciales', done: stats.ownedAlternatives >= 100 },
  ]
}

/** Home page for signed-in players: a bento dashboard with progression, a game to resume, quick actions and treasures. */
export default function MemberHome() {
  useReveal()
  const { data: session } = useSession()
  const overview = useRemote<CollectorOverview>('/api/collector')
  const catalogue = useRemote<{ sets: BoosterCatalogItem[] }>('/api/booster')
  const history = useRemote<HistoryPage>('/api/booster/history')
  const active = useRemote<ActiveGame>('/api/play/games/active')
  const [detail, setDetail] = useState<CatalogueCard | null>(null)
  const stats = overview.data, firstName = session?.user?.name?.split(' ')[0]
  const progress = stats ? rankOf(stats.percentage, stats.catalogue, stats.unique) : null
  const rankStart = progress ? progress.rank.at : 0, rankEnd = progress?.next?.at ?? 100
  const rankShare = stats ? Math.min(100, Math.max(0, ((stats.percentage - rankStart) / Math.max(1, rankEnd - rankStart)) * 100)) : 0
  // Suggested boosters: the openable extensions the player has completed the least.
  const suggested = useMemo(() => (catalogue.data?.sets ?? []).filter(s => s.available)
    .map(set => ({ set, p: stats?.sets.find(x => x.code === set.code) }))
    .sort((a, b) => (a.p?.percentage ?? 0) - (b.p?.percentage ?? 0)).slice(0, 4), [catalogue.data, stats])
  const game = active.data?.game, next = suggested[0]
  const badges = stats ? badgesOf(stats) : []
  return <div className="fx-home hm">
    <OceanBackdrop />
    <section className="hm-bento">
      <Tilt className="hm-tile hm-hero" max={4}>
        <div className="hm-hero-ring">
          <Ring value={stats?.percentage ?? 0} size={150} />
          <div className="hm-hero-ring-label"><strong>{stats ? `${stats.percentage}%` : '…'}</strong><span>du catalogue</span></div>
        </div>
        <div className="hm-hero-copy">
          <p className="fx-kicker">{firstName ? `Ahoy, ${firstName} !` : 'Bienvenue à bord'}</p>
          <h1><span className="fx-gradient-text">{progress ? progress.rank.name : 'Pirate'}</span> en route vers le One Piece</h1>
          {progress && stats && <div className="hm-xp">
            <div className="hm-xp-bar"><i style={{ width: `${rankShare}%` }} /></div>
            <p>{progress.next ? <>Encore <b>{progress.toNext.toLocaleString('fr-FR')}</b> cartes pour devenir <b>{progress.next.name}</b></> : <>Rang maximal atteint : <b>{RANKS.at(-1)!.name}</b></>}</p>
          </div>}
          <div className="hm-actions"><Link href="/boosters" className="fx-btn"><PackageOpen size={18} />Ouvrir un booster</Link><Link href="/play" className="fx-btn ghost"><Swords size={18} />Jouer</Link></div>
        </div>
      </Tilt>

      {game && game.status === 'ACTIVE' ? <Link href="/play" className="hm-tile hm-resume">
        <span className="hm-resume-pulse"><PlayCircle size={34} /></span><div><strong>Reprendre ma partie</strong><span>Tour {game.projection.turn} · le bot vous attend</span></div><ArrowRight size={22} />
      </Link> : <Link href="/play" className="hm-tile hm-resume idle">
        <span className="hm-resume-pulse"><Swords size={30} /></span><div><strong>Lancer une partie</strong><span>35 Starter Decks contre le bot</span></div><ArrowRight size={22} />
      </Link>}

      {next && <Tilt className="hm-tile hm-pack-tile"><Link href={`/booster-opening?set=${encodeURIComponent(next.set.code)}`} aria-label={`Ouvrir ${next.set.code}`}>
        <div className="hm-pack-glow" /><PackArt src={next.set.imageUrl} alt={`Booster ${next.set.code}`} />
        <div className="hm-pack-copy"><p className="fx-kicker">À ouvrir</p><b>{boosterTitle(next.set)}</b><small>{next.set.code}{next.p ? ` · ${next.p.percentage}%` : ''}</small></div>
      </Link></Tilt>}

      <Tilt className="hm-tile hm-treasure-tile"><DailyTreasure compact /></Tilt>

      <Link href="/collection" className="hm-tile hm-quick"><BookOpen size={22} /><b>Collection</b><small>Mon classeur</small></Link>
      <Link href="/decks" className="hm-tile hm-quick"><Layers size={22} /><b>Decks</b><small>{stats ? `${stats.decks} deck${stats.decks > 1 ? 's' : ''}` : 'Mes decks'}</small></Link>
    </section>

    <LoadState loading={overview.loading} error={overview.error} retry={overview.retry} />
    {stats && <section className="piece-stats hm-stats" aria-label="Statistiques de collection" data-reveal>
      <div className="piece-stat"><Counter label={`Cartes uniques · ${stats.total.toLocaleString('fr-FR')} exemplaires`} value={stats.unique} accent /></div>
      <div className="piece-stat" data-stat="other"><Counter label="Decks créés" value={stats.decks} /></div>
      <div className="piece-stat" data-stat="openings"><Counter label="Boosters ouverts" value={stats.openings} /></div>
      <div className="piece-stat" data-stat="other"><Counter label="Extensions disponibles" value={catalogue.data?.sets.filter(s => s.available).length ?? 0} /></div>
    </section>}

    {stats && <section className="hm-section" data-reveal><SectionHeading title="Dernières cartes obtenues" href="/history" />
      {stats.recentCards.length ? <div className="hm-hand" style={{ '--n': Math.min(9, stats.recentCards.length) } as CSSProperties}>{stats.recentCards.slice(0, 9).map((card, i, all) => <div key={card.id} className="hm-hand-card" style={{ '--i': i - (all.length - 1) / 2 } as CSSProperties}><CardTile card={card} onClick={() => setDetail(card)} /></div>)}</div>
        : <EmptyState title="Votre première découverte vous attend" description="Ouvrez un booster pour commencer votre collection." />}</section>}

    {badges.length > 0 && <section className="hm-section" data-reveal>
      <SectionHeading title={`Vos badges · ${badges.filter(b => b.done).length} / ${badges.length}`} />
      <div className="hm-badges">{badges.map(b => <div key={b.name} className={`hm-badge${b.done ? ' done' : ''}`} title={b.hint}><span>{b.done ? <Trophy size={20} /> : <Lock size={18} />}</span><b>{b.name}</b><small>{b.hint}</small></div>)}</div>
    </section>}

    <section className="hm-section" data-reveal><SectionHeading title="Boosters conseillés" href="/boosters" label="Toutes les extensions" />
      <LoadState loading={catalogue.loading} error={catalogue.error} retry={catalogue.retry} />
      <div className="hm-boosters">{suggested.map(({ set, p }) => <Tilt key={set.code} className="hm-booster">
        <Link href={`/booster-opening?set=${encodeURIComponent(set.code)}`} className="hm-booster-art" aria-label={`Ouvrir ${set.code}`}><PackArt src={set.imageUrl} alt={`Booster ${set.code}`} /></Link>
        <div className="hm-booster-body"><span className="hm-booster-code">{set.code}</span><h3>{boosterTitle(set)}</h3>
          <p>{p ? `${p.unique} / ${p.total} cartes · ${p.percentage}%` : `${set.cardCount} cartes`}</p>{p && <Progress value={p.percentage} label={`Progression ${set.code}`} />}
          <Link href={`/booster-opening?set=${encodeURIComponent(set.code)}`} className="fx-btn small"><PackageOpen size={15} />Ouvrir</Link></div>
      </Tilt>)}</div></section>

    {stats && <div className="hm-columns" data-reveal>
      <section><SectionHeading title="Dernières ouvertures" href="/history" /><LoadState loading={history.loading} error={history.error} retry={history.retry} />
        <div className="hm-openings">{history.data?.openings.slice(0, 4).map(row => <Link key={row.id} href={`/history?opening=${row.id}`} className="hm-opening"><span><PackageOpen size={18} /></span><div><strong>{boosterTitle({ code: row.setCode, name: row.setName })}</strong><p>{row.setCode} · {new Date(row.openedAt).toLocaleString('fr-FR')} · {row.cardCount} cartes</p></div><ArrowRight size={17} /></Link>)}</div>
        {history.data && !history.data.openings.length && <EmptyState title="Le début du voyage" description="Vos ouvertures seront conservées ici." />}</section>
      <section><SectionHeading title="Vos trésors rares" href="/collection" />{stats.recentRareCards.length ? <div className="hm-treasures">{stats.recentRareCards.slice(0, 3).map(card => <Tilt key={card.id} max={12}><CardTile card={card} onClick={() => setDetail(card)} /></Tilt>)}</div>
        : <EmptyState title="Les trésors se font désirer" description="Les cartes rares et spéciales de votre collection apparaîtront ici." />}</section>
    </div>}
    <p className="hm-signoff" data-reveal><Sparkles size={14} /> Chaque carte raconte une histoire.</p>
    <CardDetail card={detail} cards={stats?.recentCards} onClose={() => setDetail(null)} />
  </div>
}
