'use client'
import Image from 'next/image'
import React, { useEffect, useMemo, useState } from 'react'
import type { BotLevel, DeckList, Stats } from './api'
import { deckErrorLabel } from './labels'

const LEVELS: { id: BotLevel; label: string; hint: string }[] = [
  { id: 'easy', label: 'Facile', hint: 'Pour découvrir les règles.' },
  { id: 'normal', label: 'Normal', hint: 'Un adversaire équilibré.' },
  { id: 'hard', label: 'Difficile', hint: 'Pour relever le défi.' },
]
type Props = { leaderImages?: Record<string, string>; decks: DeckList | null; busy: boolean; level: BotLevel; onLevel: (level: BotLevel) => void; stats: Stats | null; tutorialSeen: boolean
  onStart: (deck: { kind: 'reference'; id: string } | { kind: 'user'; deckId: string }, tutorial?: boolean, level?: BotLevel) => void }

/** Presentation only. Availability, composition and errors come from the existing server API. */
export function DeckPicker({ leaderImages = {}, decks, busy, level, onLevel, stats, onStart, tutorialSeen }: Props) {
  const [query, setQuery] = useState(''), [selectedId, setSelectedId] = useState<string | null>(null)
  const starters = useMemo(() => (decks?.reference ?? []).filter(deck => deck.id.startsWith('starter-')), [decks])
  const selected = starters.find(deck => deck.id === selectedId)
  const filtered = starters.filter(deck => `${deck.name} ${deck.id} ${deck.leader ?? ''}`.toLocaleLowerCase('fr').includes(query.trim().toLocaleLowerCase('fr')))
  const tutorialDeck = starters.find(deck => deck.id === 'starter-st01' && deck.ok)
  return <main className="play-picker play-starter-picker">
    <header className="starter-hero">
      <div><p className="piece-eyebrow">Mugiwara TCG · One Piece Card Game</p><h1>Choisissez votre équipage</h1><p className="piece-muted">Un Starter Deck, un adversaire, et l’aventure commence.</p></div>
      <div className="starter-total"><strong>{starters.filter(deck => deck.ok).length}</strong><span>decks disponibles</span></div>
    </header>
    <section className="starter-preferences" aria-label="Préparer la partie">
      <div><h2>Votre adversaire</h2><div className="play-levels" role="radiogroup" aria-label="Difficulté du bot">{LEVELS.map(l => <button key={l.id} type="button" role="radio" aria-checked={level === l.id} className={`play-level${level === l.id ? ' on' : ''}`} onClick={() => onLevel(l.id)} disabled={busy}><strong>{l.label}</strong><span>{l.hint}</span></button>)}</div></div>
      <div className="starter-tutorial"><strong>{tutorialSeen ? 'Un rappel avant de jouer ?' : 'Votre première partie ?'}</strong><p>Découvrez les DON!!, les attaques et les Counters avec ST-01.</p><button type="button" className="piece-button secondary" disabled={busy || !tutorialDeck} onClick={() => tutorialDeck && onStart({ kind: 'reference', id: tutorialDeck.id }, true, 'easy')}>Partie guidée</button></div>
    </section>
    <section className="starter-catalog" aria-label="Starter Decks">
      <div className="starter-catalog-top"><h2>Starter Decks <span>{filtered.length}</span></h2><label className="starter-search"><span>Rechercher un deck</span><input type="search" placeholder="ST-01, Luffy, Uta…" value={query} onChange={e => setQuery(e.target.value)} /></label></div>
      {!decks ? <p role="status">Vérification des Starter Decks…</p> : !filtered.length ? <p className="piece-muted">Aucun Starter Deck ne correspond à votre recherche.</p> : <ul className="play-deck-list starter-deck-grid">{filtered.map(deck => {
        const code = deck.id.match(/^starter-st(\d+)/)?.[1]
        return <li key={deck.id}><button type="button" className={`play-deck starter-deck-card${selectedId === deck.id ? ' selected' : ''}`} disabled={busy || !deck.ok} aria-pressed={selectedId === deck.id} onClick={() => setSelectedId(deck.id)}>
          <div className="starter-deck-top"><span className="starter-code">{code ? `ST-${code}` : 'Starter Deck'}</span><span className={`starter-state${deck.ok ? '' : ' unavailable'}`}>{deck.ok ? 'Disponible' : 'Indisponible'}</span></div>
          <div className="starter-deck-body"><div className="starter-deck-description"><strong>{deck.name}</strong>
          {deck.leader && <span className="starter-leader">Leader : {deck.leader}</span>}
          <span>{deck.description}</span></div><LeaderPortrait image={deck.leader ? leaderImages[deck.leader] : undefined} name={deck.name} /></div>
          {!deck.ok && <em>{deck.errors.map(deckErrorLabel).join(', ')}</em>}
          <span className="starter-card-footer">{selectedId === deck.id ? '✓ Équipage sélectionné' : deck.ok ? 'Choisir cet équipage →' : 'Certification nécessaire'}</span>
        </button></li>
      })}</ul>}
    </section>
    <section className="starter-launch" aria-label="Lancer la partie">
      <div><strong>{selected?.name ?? 'Choisissez un Starter Deck'}</strong><span>{selected ? `Adversaire ${LEVELS.find(l => l.id === level)?.label.toLocaleLowerCase('fr')}` : 'Les decks de référence sont accessibles sans posséder les cartes.'}</span></div>
      <button type="button" className="piece-button" disabled={busy || !selected?.ok} onClick={() => selected?.ok && onStart({kind:'reference',id:selected.id})}>{busy ? 'Préparation…' : 'Prendre la mer'}</button>
    </section>
    <details className="starter-stats"><summary>Vos statistiques{stats ? ` · ${stats.wins} victoires / ${stats.played} parties` : ''}</summary>
      {!stats ? <p className="piece-muted">Chargement…</p> : <><section className="play-stats-grid" aria-label="Statistiques de jeu"><div><strong>{stats.played}</strong><span>parties</span></div><div><strong>{stats.wins}</strong><span>victoires</span></div><div><strong>{stats.losses}</strong><span>défaites</span></div><div><strong>{stats.concessions}</strong><span>abandons</span></div></section>
      {Object.entries(stats.byLevel).map(([k,v]) => <p key={k} className="play-stats-row">Adversaire {LEVELS.find(l=>l.id===k)?.label ?? k} : {v.wins}/{v.played} victoires</p>)}
      {Object.entries(stats.byDeck).map(([k,v]) => <p key={k} className="play-stats-row">{decks?.reference.find(deck=>deck.id===k)?.name ?? 'Deck personnel'} : {v.wins}/{v.played} victoires</p>)}</>}
    </details>
  </main>
}

function LeaderPortrait({ image, name }: { image?: string; name: string }) {
  const [broken, setBroken] = useState(false)
  useEffect(() => { setBroken(false) }, [image])
  return <div className="starter-leader-portrait">{image && !broken ? <Image src={image} alt={`Leader du deck ${name}`} fill sizes="(max-width:640px) 100px, 96px" onError={() => setBroken(true)} /> : <Image src="/images/card-back.jpg" alt="Illustration du Leader indisponible" fill sizes="96px" />}</div>
}
