'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { playApi, type BotLevel, type DeckList, type Stats, type View } from './api'
import { Board } from './Board'
import { animationSteps, journal, lastSequence, type AnimStep, type LogEntry } from './anim'
import { deckErrorLabel, errorLabel } from './labels'
import { prompt, type Intent } from './model'
import { TUTORIAL_KEY, type TutorialState } from './Tutorial'

type Screen = { kind: 'loading' } | { kind: 'pick'; decks: DeckList | null } | { kind: 'board'; view: View } | { kind: 'error'; message: string }
type Motion = 'auto' | 'reduced' | 'full'
const MOTION_KEY = 'mugiwara:play:motion'
const seenKey = (gameId: string) => `mugiwara:play:seen:${gameId}`
const read = (storage: () => Storage, key: string) => { try { return storage().getItem(key) } catch { return null } }
const write = (storage: () => Storage, key: string, value: string) => { try { storage().setItem(key, value) } catch { /* private mode */ } }
const LEVELS: { id: BotLevel; label: string; hint: string }[] = [
  { id: 'easy', label: 'Facile', hint: 'Ne défend pas, joue peu : idéal pour apprendre.' },
  { id: 'normal', label: 'Normal', hint: 'Développe son terrain, contre et attaque.' },
  { id: 'hard', label: 'Difficile', hint: 'Gère ses DON!!, élimine les menaces, défend au bon moment.' },
]

export default function PlayApp() {
  const router = useRouter()
  const [screen, setScreen] = useState<Screen>({ kind: 'loading' })
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [queue, setQueue] = useState<AnimStep[]>([])
  const [step, setStep] = useState<AnimStep | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [motion, setMotion] = useState<Motion>('auto')
  const [systemReduced, setSystemReduced] = useState(false)
  const [tutorial, setTutorial] = useState<TutorialState>({ active: false, step: 0 })
  const [level, setLevel] = useState<BotLevel>('normal')
  const [stats, setStats] = useState<Stats | null>(null)
  const seen = useRef<number | null>(null), previous = useRef<View | null>(null), sending = useRef(false)
  const reduced = motion === 'reduced' || (motion === 'auto' && systemReduced)
  const reducedRef = useRef(reduced); reducedRef.current = reduced

  useEffect(() => {
    const saved = read(() => localStorage, MOTION_KEY); if (saved === 'auto' || saved === 'full' || saved === 'reduced') setMotion(saved)
    const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
    if (media) { setSystemReduced(media.matches); const change = () => setSystemReduced(media.matches); media.addEventListener('change', change); return () => media.removeEventListener('change', change) }
  }, [])
  const changeMotion = (m: Motion) => { setMotion(m); write(() => localStorage, MOTION_KEY, m) }

  // Shows a confirmed view. Only events after the last one already shown are animated, so a refresh replays nothing.
  const show = useCallback((view: View) => {
    if (seen.current === null || previous.current?.gameId !== view.gameId) {
      const stored = Number(read(() => sessionStorage, seenKey(view.gameId)))
      seen.current = Number.isFinite(stored) && read(() => sessionStorage, seenKey(view.gameId)) !== null ? stored : lastSequence(view)
      previous.current = null
    }
    const steps = animationSteps(previous.current, view, seen.current)
    seen.current = lastSequence(view); write(() => sessionStorage, seenKey(view.gameId), String(seen.current))
    previous.current = view
    if (!reducedRef.current && steps.length) setQueue(q => [...q, ...steps].slice(-24))
    setLog(journal(view))
    setScreen({ kind: 'board', view })
  }, [])
  // Plays the queue one step at a time; nothing waits on it (the board stays usable).
  useEffect(() => {
    if (step || !queue.length) return
    if (reduced) { setQueue([]); return }
    const [next, ...rest] = queue
    setStep(next); setQueue(rest)
  }, [queue, step, reduced])
  useEffect(() => { if (!step) return; const t = setTimeout(() => setStep(null), step.duration); return () => clearTimeout(t) }, [step])
  const skip = () => { setQueue([]); setStep(null) }

  const loadDecks = useCallback(async () => {
    setScreen({ kind: 'pick', decks: null })
    const [decks, s] = await Promise.all([playApi.decks(), playApi.stats()])
    if (s.ok) setStats(s.data.stats)
    if (!decks.ok) { setScreen({ kind: 'error', message: errorLabel(decks.error) }); return }
    setScreen({ kind: 'pick', decks: decks.data })
  }, [])
  useEffect(() => { void (async () => {
    const active = await playApi.active()
    if (!active.ok) { setScreen({ kind: 'error', message: errorLabel(active.error) }); return }
    if (active.data.game) show(active.data.game); else await loadDecks()
  })() }, [show, loadDecks])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3200); return () => clearTimeout(t) }, [toast])

  const send = useCallback(async (intent: Intent) => {
    if (screen.kind !== 'board' || sending.current) return // a single command in flight: no double send
    sending.current = true; setBusy(true)
    const reply = await playApi.command(screen.view, intent)
    if (reply.ok) show(reply.data.game)
    else {
      setToast(errorLabel(reply.error))
      if (reply.status === 409 || reply.status === 422) { const fresh = await playApi.view(screen.view.gameId); if (fresh.ok) show(fresh.data.game) }
    }
    sending.current = false; setBusy(false)
  }, [screen, show])
  // Refresh, Draw, DON!! and End phases have no decision: advance them once the animations are shown.
  useEffect(() => {
    if (screen.kind !== 'board' || busy || step || queue.length || prompt(screen.view).kind !== 'advance') return
    const t = setTimeout(() => void send({ type: 'ADVANCE_PHASE' }), reduced ? 120 : 380)
    return () => clearTimeout(t)
  }, [screen, busy, step, queue, send, reduced])
  useEffect(() => { if (screen.kind === 'board' && screen.view.status === 'FINISHED') void playApi.stats().then(s => { if (s.ok) setStats(s.data.stats) }) }, [screen])

  const start = async (deck: { kind: 'reference'; id: string } | { kind: 'user'; deckId: string }, withTutorial = false, startLevel = level) => {
    setBusy(true); seen.current = null; previous.current = null; setQueue([]); setStep(null)
    const reply = await playApi.start(deck, startLevel)
    setBusy(false)
    if (reply.ok) { setTutorial({ active: withTutorial, step: 0 }); show(reply.data.game) }
    else if (reply.error === 'ACTIVE_GAME_EXISTS') { const active = await playApi.active(); if (active.ok && active.data.game) show(active.data.game) }
    else setToast(errorLabel(reply.error))
  }
  const concede = async () => {
    if (screen.kind !== 'board') return
    setBusy(true); const reply = await playApi.concede(screen.view); setBusy(false)
    if (reply.ok) show(reply.data.game); else setToast(errorLabel(reply.error))
  }

  if (screen.kind === 'loading') return <div className="play-shell"><p className="play-loading" role="status">Chargement de la table…</p></div>
  if (screen.kind === 'error') return <div className="play-shell"><div className="piece-panel play-message"><h1>Jeu indisponible</h1><p className="piece-muted">{screen.message}</p><button type="button" className="piece-button" onClick={() => router.push('/login')}>Se connecter</button></div></div>
  if (screen.kind === 'pick') return <div className="play-shell"><DeckPicker decks={screen.decks} busy={busy} level={level} onLevel={setLevel} stats={stats} onStart={start}
    tutorialSeen={read(() => localStorage, TUTORIAL_KEY) !== null} />{toast && <p className="play-toast" role="alert">{toast}</p>}</div>
  return createPortal(<div className="play-layer">
    <Board view={screen.view} send={send} busy={busy} step={step} log={log} motion={motion} reduced={reduced} onMotion={changeMotion} onConcede={concede} onSkipAnim={skip}
      onLeave={() => router.push('/home')} onNewGame={() => { seen.current = null; previous.current = null; void loadDecks() }} tutorial={tutorial} onTutorial={setTutorial}
      stats={stats ? <p className="tbl-result-stats">{stats.played} parties · {stats.wins} victoires · {stats.losses} défaites</p> : null} />
    {toast && <p className="play-toast" role="alert">{toast}</p>}
  </div>, document.body)
}

function DeckPicker({ decks, busy, level, onLevel, stats, onStart, tutorialSeen }: { decks: DeckList | null; busy: boolean; level: BotLevel; onLevel: (l: BotLevel) => void; stats: Stats | null; tutorialSeen: boolean
  onStart: (deck: { kind: 'reference'; id: string } | { kind: 'user'; deckId: string }, tutorial?: boolean, level?: BotLevel) => void }) {
  const names: Record<string, string> = Object.fromEntries((decks?.reference ?? []).map(d => [d.id, d.name]))
  return <main className="play-picker">
    <p className="piece-eyebrow">Mugiwara TCG · Partie contre le bot</p>
    <h1>Prêt à prendre la mer ?</h1>
    <p className="piece-muted">Le moteur applique les règles officielles et ne joue que les cartes revues. Vos decks sont vérifiés avant la partie ; votre collection n’est jamais modifiée.</p>
    <section className="play-tutorial-card"><div><strong>{tutorialSeen ? 'Revoir le tutoriel' : 'Première partie ?'}</strong><span>Une partie guidée contre le bot Facile : Leader, DON!!, attaques, Counter, Blocker.</span></div>
      <button type="button" className="piece-button" disabled={busy} onClick={() => onStart({ kind: 'reference', id: 'reference-red' }, true, 'easy')}>Lancer le tutoriel</button></section>
    <h2>Difficulté du bot</h2>
    <div className="play-levels" role="radiogroup" aria-label="Difficulté du bot">{LEVELS.map(l => <button key={l.id} type="button" role="radio" aria-checked={level === l.id} className={`play-level${level === l.id ? ' on' : ''}`} onClick={() => onLevel(l.id)}><strong>{l.label}</strong><span>{l.hint}</span></button>)}</div>
    {!decks ? <p role="status">Vérification des decks…</p> : <>
      <h2>Decks de référence</h2>
      <ul className="play-deck-list">{decks.reference.map(d => <li key={d.id}><button type="button" className="play-deck" disabled={busy || !d.ok} onClick={() => onStart({ kind: 'reference', id: d.id })}>
        <strong>{d.name}</strong><span>{d.description}</span>{!d.ok && <em>Indisponible : {d.errors.map(deckErrorLabel).join(', ')}</em>}</button></li>)}</ul>
      <h2>Vos decks</h2>
      {decks.collection && <p className="play-collection">Votre collection : {decks.collection.owned} cartes distinctes, dont <strong>{decks.collection.recognised}</strong> reconnues par le moteur et <strong>{decks.collection.certified}</strong> certifiées jouables.</p>}
      {!decks.user.length ? <p className="piece-muted">Aucun deck enregistré.</p> : <ul className="play-deck-list">{decks.user.map(d => <li key={d.id}><button type="button" className="play-deck" disabled={busy || !d.ok} onClick={() => onStart({ kind: 'user', deckId: d.id })}>
        <strong>{d.name}</strong>{d.ok ? <span>Jouable</span> : <em>Non jouable : ce deck {[...new Set(d.errors.map(deckErrorLabel))].join(', ')}.</em>}</button></li>)}</ul>}
    </>}
    <h2>Vos statistiques</h2>
    {!stats ? <p className="piece-muted">Chargement…</p> : <section className="play-stats-grid" aria-label="Statistiques de jeu">
      <div><strong>{stats.played}</strong><span>parties</span></div><div><strong>{stats.wins}</strong><span>victoires</span></div><div><strong>{stats.losses}</strong><span>défaites</span></div><div><strong>{stats.concessions}</strong><span>abandons</span></div>
      {Object.entries(stats.byLevel).map(([k, v]) => <p key={k} className="play-stats-row">Bot {LEVELS.find(l => l.id === k)?.label ?? k} : {v.wins}/{v.played} victoires</p>)}
      {Object.entries(stats.byDeck).map(([k, v]) => <p key={k} className="play-stats-row">{names[k] ?? (k.startsWith('user:') ? 'Deck personnel' : k)} : {v.wins}/{v.played} victoires</p>)}
    </section>}
  </main>
}
