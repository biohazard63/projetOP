'use client'
import Image from 'next/image'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { BotLevel, DeckList, Opponent, Stats } from './api'
import { deckErrorLabel } from './labels'

const LEVELS: { id: BotLevel; label: string; hint: string }[] = [
  { id: 'easy', label: 'Facile', hint: 'Pour découvrir les règles.' },
  { id: 'normal', label: 'Normal', hint: 'Un adversaire équilibré.' },
  { id: 'hard', label: 'Difficile', hint: 'Pour relever le défi.' },
]
const COLORS: { id: string; label: string }[] = [
  { id: 'RED', label: 'Rouge' }, { id: 'GREEN', label: 'Vert' }, { id: 'BLUE', label: 'Bleu' },
  { id: 'PURPLE', label: 'Violet' }, { id: 'BLACK', label: 'Noir' }, { id: 'YELLOW', label: 'Jaune' },
]
const colorLabel = (id: string) => COLORS.find(c => c.id === id)?.label ?? id
type Props = { leaderImages?: Record<string, string>; decks: DeckList | null; busy: boolean; level: BotLevel; onLevel: (level: BotLevel) => void; stats: Stats | null; tutorialSeen: boolean
  onStart: (deck: { kind: 'reference'; id: string } | { kind: 'user'; deckId: string }, tutorial?: boolean, level?: BotLevel, opponent?: Opponent) => void }

/**
 * Presentation only. Availability, composition and errors come from the existing server API.
 * Leader carousel: the centred Leader is the selected crew; it follows the thumb while swiped and snaps to the nearest
 * Leader (a quick flick carries further), and also moves with the wheel, the arrow keys or a click on a side Leader.
 */
export function DeckPicker({ leaderImages = {}, decks, busy, level, onLevel, stats, onStart, tutorialSeen }: Props) {
  const [query, setQuery] = useState(''), [color, setColor] = useState<string | null>(null), [language, setLanguage] = useState<'fr' | 'en' | null>(null), [selectedId, setSelectedId] = useState<string | null>(null)
  const starters = useMemo(() => (decks?.reference ?? []).filter(deck => deck.id.startsWith('starter-')), [decks])
  const filtered = useMemo(() => starters.filter(deck => (!color || (deck.colors ?? []).includes(color)) && (!language || deck.language === language)
    && `${deck.name} ${deck.id} ${deck.leader ?? ''} ${deck.leaderName ?? ''}`.toLocaleLowerCase('fr').includes(query.trim().toLocaleLowerCase('fr'))), [starters, color, language, query])
  const index = Math.max(0, filtered.findIndex(deck => deck.id === selectedId))
  const selected = filtered[index]
  useEffect(() => { if (filtered.length && !filtered.some(deck => deck.id === selectedId)) setSelectedId(filtered[0].id) }, [filtered, selectedId])
  const go = (i: number) => { const next = filtered[Math.min(filtered.length - 1, Math.max(0, i))]; if (next) setSelectedId(next.id) }

  // Thumb/mouse drag: the track follows the finger (drag offset in pixels), then snaps; a fast flick carries further.
  const [drag, setDrag] = useState(0)
  const gesture = useRef<{ x: number; y: number; t: number; moved: boolean; horizontal: boolean | null } | null>(null)
  const swiped = useRef(false), step = useRef(160), wheel = useRef({ acc: 0, at: 0 })
  const trackRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const measure = () => { const w = trackRef.current?.clientWidth ?? 800; step.current = Math.max(110, Math.min(220, w / 5.2)) }
    measure(); window.addEventListener('resize', measure); return () => window.removeEventListener('resize', measure)
  }, [])
  const onPointerDown = (e: React.PointerEvent) => { gesture.current = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, horizontal: null }; swiped.current = false }
  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current; if (!g) return
    const dx = e.clientX - g.x, dy = e.clientY - g.y
    if (g.horizontal === null && Math.hypot(dx, dy) > 8) { g.horizontal = Math.abs(dx) > Math.abs(dy); if (g.horizontal) (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId) }
    if (g.horizontal) { g.moved = true; setDrag(dx) }
  }
  const onPointerEnd = (e: React.PointerEvent) => {
    const g = gesture.current; gesture.current = null
    if (!g?.moved) { setDrag(0); return }
    const dx = e.clientX - g.x, speed = dx / Math.max(1, performance.now() - g.t) // px per ms
    const shift = Math.round(-dx / step.current) + (Math.abs(speed) > .6 ? -Math.sign(speed) * Math.min(3, Math.round(Math.abs(speed) * 2)) : 0)
    swiped.current = true; setDrag(0); go(index + shift)
  }
  const onWheel = (e: React.WheelEvent) => {
    const now = performance.now(), w = wheel.current
    if (now - w.at > 250) w.acc = 0
    w.acc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; w.at = now
    if (Math.abs(w.acc) > 60) { go(index + Math.sign(w.acc)); w.acc = 0 }
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1) } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1) }
    else if (e.key === 'Enter' && selected?.ok && !busy) onStart({ kind: 'reference', id: selected.id }, false, level, opponent)
  }

  // The bot's deck: 'random' (drawn by the server among the playable decks) or a playable Starter deck.
  const [opponentId, setOpponentId] = useState('random')
  const opponents = useMemo(() => starters.filter(deck => deck.ok), [starters])
  const opponent: Opponent = opponentId === 'random' ? 'random' : { kind: 'reference', id: opponentId }
  const available = starters.filter(deck => deck.ok).length
  return <main className="play-picker play-starter-picker">
    <header className="starter-hero">
      <div><p className="piece-eyebrow">Mugiwara TCG · One Piece Card Game</p><h1>Choisissez votre équipage</h1><p className="piece-muted">Faites défiler les Leaders, puis prenez la mer.</p></div>
      <div className="starter-total"><strong>{available}</strong><span>decks disponibles</span></div>
    </header>
    <div className="starter-toolbar">
      <div className="starter-languages" role="radiogroup" aria-label="Édition">
        {([[null, 'Toutes'], ['fr', 'VF'], ['en', 'EN']] as const).map(([id, label]) => <button key={label} type="button" role="radio" aria-checked={language === id} title={id === 'fr' ? 'Starter Decks sortis en français' : id === 'en' ? 'Starter Decks sortis seulement en anglais' : undefined} className={`starter-language${language === id ? ' on' : ''}`} onClick={() => setLanguage(id)}>{label}{id && <span>{starters.filter(d => d.language === id).length}</span>}</button>)}
      </div>
      <div className="starter-colors" role="radiogroup" aria-label="Couleur du Leader">
        <button type="button" role="radio" aria-checked={color === null} className={`starter-color all${color === null ? ' on' : ''}`} onClick={() => setColor(null)}>Toutes</button>
        {COLORS.map(c => <button key={c.id} type="button" role="radio" aria-checked={color === c.id} className={`starter-color ${c.id.toLowerCase()}${color === c.id ? ' on' : ''}`} onClick={() => setColor(color === c.id ? null : c.id)}>{c.label}</button>)}
      </div>
      <label className="starter-search"><span>Rechercher un deck</span><input type="search" placeholder="ST-01, Luffy, Uta…" value={query} onChange={e => setQuery(e.target.value)} /></label>
    </div>
    <section className="starter-catalog starter-carousel" aria-label="Starter Decks" aria-roledescription="carrousel" tabIndex={0} onKeyDown={onKey} onWheel={onWheel}>
      {!decks ? <p role="status" className="starter-empty">Vérification des Starter Decks…</p> : !filtered.length ? <p className="piece-muted starter-empty">Aucun Starter Deck ne correspond à votre recherche.</p> : <>
        <button type="button" className="starter-nav prev" aria-label="Leader précédent" disabled={index === 0} onClick={() => go(index - 1)}>‹</button>
        <div ref={trackRef} className={`starter-track${drag ? ' dragging' : ''}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}>
          {filtered.map((deck, i) => {
            const offset = i - index + drag / step.current, distance = Math.abs(offset), code = deck.id.match(/^starter-st(\d+)/)?.[1]
            const style = { transform: `translateX(calc(-50% + ${offset * step.current}px)) scale(${Math.max(.55, 1 - distance * .16)}) rotateY(${Math.max(-40, Math.min(40, -offset * 16))}deg)`,
              zIndex: 100 - Math.round(distance * 10), opacity: distance > 3.4 ? 0 : 1 - Math.max(0, distance - 2) * .5 } as React.CSSProperties
            return <button key={deck.id} type="button" className={`play-deck starter-deck-card${i === index ? ' selected' : ''}${deck.ok ? '' : ' unavailable'}`} style={style}
              aria-pressed={i === index} aria-label={`${deck.name}${deck.ok ? '' : ' (indisponible)'}`} tabIndex={distance > 3.4 ? -1 : 0} disabled={busy}
              onClick={() => { if (swiped.current) { swiped.current = false; return } setSelectedId(deck.id) }}>
              <LeaderPortrait image={deck.leader ? leaderImages[deck.leader] : undefined} name={deck.name} eager={distance < 2.5} />
              <span className="starter-card-code">{code ? `ST-${code}` : 'Starter'}{deck.language && <em className={`starter-lang ${deck.language}`}>{deck.language === 'fr' ? 'VF' : 'EN'}</em>}</span>
              {!deck.ok && <span className="starter-state unavailable">Indisponible</span>}
              <strong className="starter-card-name">{deck.name}</strong>
            </button>
          })}
        </div>
        <button type="button" className="starter-nav next" aria-label="Leader suivant" disabled={index >= filtered.length - 1} onClick={() => go(index + 1)}>›</button>
        <p className="starter-position" aria-live="polite">{index + 1} / {filtered.length}</p>
      </>}
    </section>
    <section className="starter-details" aria-label="Lancer la partie">
      <div className="starter-details-info">
        {selected ? <>
          <p className="starter-details-code">{selected.id.match(/^starter-st(\d+)/) ? `ST-${selected.id.match(/^starter-st(\d+)/)![1]}` : 'Starter Deck'}{(selected.colors ?? []).map(c => <span key={c} className={`starter-pill ${c.toLowerCase()}`}>{colorLabel(c)}</span>)}</p>
          <h2>{selected.name}</h2>
          {selected.leaderName && <p className="starter-leader">Leader : {selected.leaderName}</p>}
          {!selected.ok && <p className="starter-unavailable">{selected.errors.map(deckErrorLabel).join(', ')}</p>}
          {!!selected.cards?.length && <details className="starter-cardlist" open>
            <summary>Cartes du deck · {selected.cards.reduce((n, c) => n + c.quantity, 0)}</summary>
            <ul>{selected.cards.map(c => <li key={c.number} className={c.category.toLowerCase()} title={`${c.name} · ${c.number}`}>
              <div className="starter-mini">{c.image ? <Image src={c.image} alt="" fill sizes="72px" draggable={false} /> : <span>{c.number}</span>}<b>{c.category === 'LEADER' ? 'Leader' : `×${c.quantity}`}</b></div>
              <span>{c.name}</span></li>)}</ul>
          </details>}
        </> : <h2>Choisissez un Starter Deck</h2>}
      </div>
      <div className="starter-details-setup">
        <div className="play-levels" role="radiogroup" aria-label="Difficulté du bot">{LEVELS.map(l => <button key={l.id} type="button" role="radio" aria-checked={level === l.id} title={l.hint} className={`play-level${level === l.id ? ' on' : ''}`} onClick={() => onLevel(l.id)} disabled={busy}><strong>{l.label}</strong></button>)}</div>
        <label className="starter-opponent"><span>Deck de l’adversaire</span><select value={opponentId} onChange={e => setOpponentId(e.target.value)} disabled={busy || !decks}>
          <option value="random">Aléatoire</option>{opponents.map(deck => <option key={deck.id} value={deck.id}>{deck.name}</option>)}</select></label>
        <div className="starter-actions">
          <button type="button" className="piece-button secondary" title={tutorialSeen ? 'Un rappel avant de jouer ?' : 'Votre première partie ?'} disabled={busy || !selected?.ok} onClick={() => selected?.ok && onStart({ kind: 'reference', id: selected.id }, true, 'easy', 'random')}>Partie guidée</button>
          <button type="button" className="piece-button" disabled={busy || !selected?.ok} onClick={() => selected?.ok && onStart({ kind: 'reference', id: selected.id }, false, level, opponent)}>{busy ? 'Préparation…' : 'Prendre la mer'}</button>
        </div>
      </div>
    </section>
    <details className="starter-stats"><summary>Vos statistiques{stats ? ` · ${stats.wins} victoires / ${stats.played} parties` : ''}</summary>
      {!stats ? <p className="piece-muted">Chargement…</p> : <><section className="play-stats-grid" aria-label="Statistiques de jeu"><div><strong>{stats.played}</strong><span>parties</span></div><div><strong>{stats.wins}</strong><span>victoires</span></div><div><strong>{stats.losses}</strong><span>défaites</span></div><div><strong>{stats.concessions}</strong><span>abandons</span></div></section>
      {Object.entries(stats.byLevel).map(([k,v]) => <p key={k} className="play-stats-row">Adversaire {LEVELS.find(l=>l.id===k)?.label ?? k} : {v.wins}/{v.played} victoires</p>)}
      {Object.entries(stats.byDeck).map(([k,v]) => <p key={k} className="play-stats-row">{decks?.reference.find(deck=>deck.id===k)?.name ?? 'Deck personnel'} : {v.wins}/{v.played} victoires</p>)}</>}
    </details>
  </main>
}

function LeaderPortrait({ image, name, eager }: { image?: string; name: string; eager?: boolean }) {
  const [broken, setBroken] = useState(false)
  useEffect(() => { setBroken(false) }, [image])
  return <div className="starter-leader-portrait">{image && !broken ? <Image src={image} alt={`Leader du deck ${name}`} fill sizes="240px" loading={eager ? 'eager' : 'lazy'} draggable={false} onError={() => setBroken(true)} /> : <Image src="/images/card-back.jpg" alt="Illustration du Leader indisponible" fill sizes="240px" draggable={false} />}</div>
}
