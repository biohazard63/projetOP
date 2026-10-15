'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { playApi, type BotLevel, type DeckList, type Opponent, type Stats, type View } from './api'
import { DeckPicker } from './DeckPicker'
import { Board } from './Board'
import { animationSteps, journal, lastSequence, type LogEntry } from './anim'
import { errorLabel } from './labels'
import { prompt, type Intent } from './model'
import { usePresentationQueue } from './usePresentationQueue'
import { READING_MODES, type ReadingMode } from './presentationTiming'
import { TUTORIAL_KEY, type TutorialState } from './Tutorial'

type Screen = { kind: 'loading' } | { kind: 'pick'; decks: DeckList | null } | { kind: 'board'; view: View } | { kind: 'error'; message: string }
type Motion = 'auto' | 'reduced' | 'full'
const MOTION_KEY = 'mugiwara:play:motion', READING_KEY = 'mugiwara:play:reading'
const seenKey = (gameId: string) => `mugiwara:play:seen:${gameId}`
const read = (storage: () => Storage, key: string) => { try { return storage().getItem(key) } catch { return null } }
const write = (storage: () => Storage, key: string, value: string) => { try { storage().setItem(key, value) } catch { /* private mode */ } }

export default function PlayApp({ leaderImages = {} }: { leaderImages?: Record<string, string> }) {
  const router = useRouter()
  const [screen, setScreen] = useState<Screen>({ kind: 'loading' })
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<Intent | null>(null) // the command in flight, shown optimistically
  const [toast, setToast] = useState<string | null>(null)
  const [fast, setFast] = useState(false)
  const [log, setLog] = useState<LogEntry[]>([])
  const [motion, setMotion] = useState<Motion>('auto')
  const [systemReduced, setSystemReduced] = useState(false)
  const [tutorial, setTutorial] = useState<TutorialState>({ active: false, step: 0 })
  const [level, setLevel] = useState<BotLevel>('normal')
  const [stats, setStats] = useState<Stats | null>(null)
  const seen = useRef<number | null>(null), previous = useRef<View | null>(null), sending = useRef(false)
  const reduced = motion === 'reduced' || (motion === 'auto' && systemReduced)
  // Reading of effect popups: the player's choice, otherwise "click to continue" for the guided game and the easy bot.
  const [readingChoice, setReadingChoice] = useState<ReadingMode | null>(null)
  const reading: ReadingMode = readingChoice ?? (tutorial.active || (screen.kind === 'board' && screen.view.botLevel === 'easy') ? 'manual' : 'auto')
  const { dispatch, step, skip, clear, reset, paused, togglePause, hold } = usePresentationQueue(reduced, fast, reading)
  const reducedRef = useRef(reduced); reducedRef.current = reduced

  useEffect(() => {
    setFast(read(() => localStorage, 'mugiwara:play:fast') === 'true')
    const saved = read(() => localStorage, MOTION_KEY); if (saved === 'auto' || saved === 'full' || saved === 'reduced') setMotion(saved)
    const savedReading = read(() => localStorage, READING_KEY); if (READING_MODES.includes(savedReading as ReadingMode)) setReadingChoice(savedReading as ReadingMode)
    const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
    if (media) { setSystemReduced(media.matches); const change = () => setSystemReduced(media.matches); media.addEventListener('change', change); return () => media.removeEventListener('change', change) }
  }, [])
  const changeMotion = (m: Motion) => { setMotion(m); write(() => localStorage, MOTION_KEY, m) }
  const changeReading = (m: ReadingMode) => { setReadingChoice(m); write(() => localStorage, READING_KEY, m) }

  // Shows a confirmed view. Only events after the last one already shown are animated, so a refresh replays nothing.
  const show = useCallback((view: View) => {
    if (previous.current?.gameId === view.gameId && previous.current.version > view.version) return
    if (seen.current === null || previous.current?.gameId !== view.gameId) {
      const stored = Number(read(() => sessionStorage, seenKey(view.gameId)))
      seen.current = Number.isFinite(stored) && read(() => sessionStorage, seenKey(view.gameId)) !== null ? stored : lastSequence(view)
      previous.current = null
    }
    const steps = animationSteps(previous.current, view, seen.current)
    seen.current = lastSequence(view); write(() => sessionStorage, seenKey(view.gameId), String(seen.current))
    previous.current = view
    dispatch({ type: 'ENQUEUE', gameId: view.gameId, steps: reducedRef.current ? steps.filter(s => s.reading) : steps })
    setLog(journal(view))
    setScreen({ kind: 'board', view })
  }, [dispatch])
  const loadDecks = useCallback(async () => {
    dispatch({ type: 'RESET' })
    setScreen({ kind: 'pick', decks: null })
    const [decks, s] = await Promise.all([playApi.decks(), playApi.stats()])
    if (s.ok) setStats(s.data.stats)
    if (!decks.ok) { setScreen({ kind: 'error', message: errorLabel(decks.error) }); return }
    setScreen({ kind: 'pick', decks: decks.data })
  }, [dispatch])
  useEffect(() => { void (async () => {
    const active = await playApi.active()
    if (!active.ok) { setScreen({ kind: 'error', message: errorLabel(active.error) }); return }
    if (active.data.game) show(active.data.game); else await loadDecks()
  })() }, [show, loadDecks])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3200); return () => clearTimeout(t) }, [toast])

  const send = useCallback(async (intent: Intent) => {
    if (screen.kind !== 'board' || sending.current) return // a single command in flight: no double send
    sending.current = true; setBusy(true); setPending(intent)
    const reply = await playApi.command(screen.view, intent)
    setPending(null)
    if (reply.ok) show(reply.data.game)
    else {
      setToast(errorLabel(reply.error))
      if (reply.status === 409 || reply.status === 422) { const fresh = await playApi.view(screen.view.gameId); if (fresh.ok) show(fresh.data.game) }
    }
    sending.current = false; setBusy(false)
  }, [screen, show])
  // Refresh, Draw, DON!! and End phases have no decision: advance independently of decorative presentation.
  useEffect(() => {
    if (screen.kind !== 'board' || busy || prompt(screen.view).kind !== 'advance') return
    void send({ type: 'ADVANCE_PHASE' })
  }, [screen, busy, send])
  useEffect(() => { if (screen.kind === 'board' && screen.view.status === 'FINISHED') void playApi.stats().then(s => { if (s.ok) setStats(s.data.stats) }) }, [screen])

  const start = async (deck: { kind: 'reference'; id: string } | { kind: 'user'; deckId: string }, withTutorial = false, startLevel = level, opponent: Opponent = 'random') => {
    setBusy(true); seen.current = null; previous.current = null; reset()
    const reply = await playApi.start(deck, startLevel, opponent)
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
  if (screen.kind === 'pick') return <div className="play-shell"><DeckPicker leaderImages={leaderImages} decks={screen.decks} busy={busy} level={level} onLevel={setLevel} stats={stats} onStart={start}
    tutorialSeen={read(() => localStorage, TUTORIAL_KEY) !== null} />{toast && <p className="play-toast" role="alert">{toast}</p>}</div>
  return createPortal(<div className="play-layer">
    <Board view={screen.view} send={send} busy={busy} pending={pending} step={step} log={log} motion={motion} reduced={reduced} onMotion={changeMotion} onConcede={concede} onSkipAnim={skip} paused={paused} onPause={togglePause} onHold={hold} reading={reading} onReading={changeReading} onSkipSequence={clear} fast={fast} onFast={value => { setFast(value); write(() => localStorage, 'mugiwara:play:fast', String(value)) }}
      onLeave={() => { clear(); router.push('/home') }} onNewGame={() => { seen.current = null; previous.current = null; void loadDecks() }} tutorial={tutorial} onTutorial={setTutorial}
      stats={stats ? <p className="tbl-result-stats">{stats.played} parties · {stats.wins} victoires · {stats.losses} défaites</p> : null} />
    {toast && <p className="play-toast" role="alert">{toast}</p>}
  </div>, document.body)
}
