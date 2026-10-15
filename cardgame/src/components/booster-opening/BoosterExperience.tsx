'use client'
import { BoosterOdds } from './BoosterOdds'

import BoosterArtwork from './BoosterArtwork'
import PackArt from './PackArt'
import { boosterTitle, compareCodes } from '@/lib/boosters/catalogPresentation'
import { isBoosterProduct } from '@/lib/boosters/products'
import { useVibration } from '@/hooks/useVibration'
import StackReveal from './StackReveal'
import BatchOpening from './BatchOpening'
import { useCardPreload } from './useCardPreload'
import OpeningSettings from './OpeningSettings'
import TearOpening from './TearOpening'
import { useCollectorPreferences } from '@/components/collector/Preferences'
import { openingEffect } from '@/lib/boosters/presentation'
import { useSearchParams } from 'next/navigation'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight, Check, ChevronLeft, ChevronRight, History, Sparkles, Volume2, VolumeX } from 'lucide-react'
import { useAudio, useSoundSetting } from '@/hooks/useAudio'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { BoosterCatalogItem, OpeningCard, OpeningResult } from '@/lib/boosters/types'
import styles from './BoosterExperience.module.css'

type Intent = { setCode: string; idempotencyKey: string; openingId?: string; revealed: number }
type HistoryRow = { id: string; setName: string; setCode: string; openedAt: string; creditedAt: string | null; cardCount: number }
const button = 'piece-button inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300 disabled:cursor-not-allowed disabled:opacity-40'
const isVariant = (card: OpeningCard, variant: 'alt' | 'parallel' | 'special') => card.drawVariant ? card.drawVariant === variant : variant === 'alt' ? card.isAltArt : variant === 'parallel' ? card.isParallel : card.isSpecial
const rare = (card: OpeningCard) => ['SR', 'SEC', 'SP', 'SP CARD', 'SR SP', 'SP SR', 'R SP', 'TR'].includes(card.rarity.toUpperCase()) || isVariant(card, 'alt') || isVariant(card, 'parallel') || isVariant(card, 'special')
class ApiError extends Error { constructor(message: string, public status: number) { super(message) } }
async function api<T>(path: string, body?: unknown): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25000)
  try {
    const response = await fetch(path, { ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}), cache: 'no-store', signal: controller.signal })
    const data = await response.json()
    if (!response.ok) throw new ApiError(data.error || 'La réponse du serveur n’a pas pu être confirmée.', response.status)
    return data
  } finally { clearTimeout(timeout) }
}
function CardImage({ card }: { card: OpeningCard }) {
  return <Image src={card.imageUrl || '/images/card-back.jpg'} alt={card.name} width={300} height={420} sizes="(max-width: 640px) 44vw, 220px" className="h-auto w-full rounded-lg" onError={event => { const image = event.currentTarget; if (!image.dataset.fallback) { image.dataset.fallback = 'true'; image.srcset = ''; image.src = '/images/card-back.jpg' } }} />
}

export default function BoosterExperience() {
  const { data: session, status } = useSession()
  const vibrate = useVibration()
  const preferences = useCollectorPreferences()
  const requestedSet = useSearchParams().get('set')
  const [reducedMotion, setReducedMotion] = useState(true)
  const { soundsEnabled, setSoundsEnabled } = useSoundSetting()
  const audio = useAudio()
  const [sets, setSets] = useState<BoosterCatalogItem[]>([])
  const [selectedSet, setSelectedSet] = useState('')
  const [query, setQuery] = useState('')
  const [opening, setOpening] = useState<OpeningResult | null>(null)
  const [revealed, setRevealed] = useState(0)
  const [busy, setBusy] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [error, setError] = useState('')
  const [catalogError, setCatalogError] = useState('')
  const [storageWarning, setStorageWarning] = useState('')
  const [pending, setPending] = useState<Intent | null>(null)
  const [canDiscard, setCanDiscard] = useState(false)
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState('')
  const [historyBusy, setHistoryBusy] = useState(false)
  const [detail, setDetail] = useState<OpeningCard | null>(null)
  const [favorite, setFavorite] = useState(false)
  const [favoriteBusy, setFavoriteBusy] = useState(false)
  const [favoriteError, setFavoriteError] = useState('')
  // Several boosters at once (×5, ×10): one request, every pack credited together, then revealed one after the other.
  const [batchCount, setBatchCount] = useState<1 | 5 | 10>(1)
  const [batch, setBatch] = useState<OpeningResult[] | null>(null)
  const [batchSummary, setBatchSummary] = useState(false)
  const showBatchSummary = useCallback(() => setBatchSummary(true), [])
  const [batchIntent, setBatchIntent] = useState<{ setCode: string; idempotencyKey: string; count: 5 | 10 } | null>(null)
  const flight = useRef(false)
  const resumedUser = useRef<string | null>(null)
  const storageKey = session?.user?.id ? `op:booster:${session.user.id}` : null
  const chosen = sets.find(set => set.code === selectedSet)
  // Openable boosters in their natural order (OP-01, OP-02 …), as on /boosters; other catalogue products stay selectable below.
  const orderedSets = [...sets].sort((a, b) => Number(!/^(OP|EB|PRB)/i.test(a.code)) - Number(!/^(OP|EB|PRB)/i.test(b.code)) || compareCodes(a.code, b.code))
  const chosenIndex = orderedSets.findIndex(set => set.code === selectedSet)
  const openedSet = sets.find(set => set.code === opening?.setCode)
  useCardPreload(animating ? opening?.cards : undefined, revealed)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(preference.matches)
    update(); preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  useEffect(() => { if (reducedMotion) setAnimating(false) }, [reducedMotion])

  const save = useCallback((intent: Intent) => {
    setPending(intent)
    if (storageKey) try { window.localStorage.setItem(storageKey, JSON.stringify(intent)) } catch { setStorageWarning('La reprise automatique est indisponible dans ce navigateur. Votre ouverture reste dans l’historique.') }
  }, [storageKey])
  // A finished opening needs no resume: the next visit shows the booster choice again (the result stays in history).
  const forget = useCallback(() => {
    setPending(null)
    if (storageKey) try { window.localStorage.removeItem(storageKey); window.sessionStorage.removeItem(storageKey) } catch { /* history remains */ }
  }, [storageKey])
  const loadHistory = useCallback(async (next?: string) => {
    setHistoryBusy(true); setHistoryError('')
    try {
      const data = await api<{ openings: HistoryRow[]; nextCursor: string | null }>(`/api/booster/history${next ? `?cursor=${encodeURIComponent(next)}` : ''}`)
      setHistory(old => next ? [...old, ...data.openings.filter(row => !old.some(previous => previous.id === row.id))] : data.openings)
      setCursor(data.nextCursor)
    } catch (e) { setHistoryError(e instanceof Error ? e.message : 'Historique indisponible') }
    finally { setHistoryBusy(false) }
  }, [])
  const requestOpening = useCallback(async (intent: Intent, animate: boolean) => {
    if (flight.current) return
    flight.current = true; setBusy(true); setError(''); setCanDiscard(false); save(intent)
    try {
      const data = intent.openingId
        ? await api<{ opening: OpeningResult }>(`/api/booster/openings/${encodeURIComponent(intent.openingId)}`)
        : await api<{ opening: OpeningResult }>('/api/booster/open', { setCode: intent.setCode, idempotencyKey: intent.idempotencyKey })
      const count = preferences.quickOpening ? data.opening.cards.length : Math.min(intent.revealed, data.opening.cards.length)
      if (!animate && intent.openingId && count >= data.opening.cards.length) { forget(); return }
      setOpening(data.opening); setSelectedSet(data.opening.setCode); setRevealed(count); setShowResult(count === data.opening.cards.length || preferences.quickOpening)
      if (count >= data.opening.cards.length) forget(); else save({ ...intent, openingId: data.opening.id, revealed: count })
      const shouldAnimate = animate && !preferences.quickOpening && preferences.animations && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      setAnimating(shouldAnimate)
      void loadHistory()
    } catch (e) {
      setError(e instanceof Error && e.name !== 'AbortError' ? e.message : 'Ouverture non confirmée. Réessayez cette ouverture pour récupérer le résultat.')
      setCanDiscard(!intent.openingId && e instanceof ApiError && [400, 422].includes(e.status))
    }
    finally { flight.current = false; setBusy(false) }
  }, [save, forget, loadHistory, preferences.animations, preferences.quickOpening])

  useEffect(() => {
    if (!session?.user?.id || resumedUser.current === session.user.id) return
    resumedUser.current = session.user.id
    void api<{ sets: BoosterCatalogItem[] }>('/api/booster').then(data => {
      setSets(data.sets); setSelectedSet(old => old || data.sets.find(set => set.code === 'OP-TEST' && set.available)?.code || data.sets.find(set => set.available)?.code || data.sets[0]?.code || '')
    }).catch(e => setCatalogError(e instanceof Error ? e.message : 'Extensions indisponibles'))
    void loadHistory()
    try {
      const stored = storageKey && (window.localStorage.getItem(storageKey) || window.sessionStorage.getItem(storageKey))
      if (stored) {
        const intent: unknown = JSON.parse(stored)
        if (typeof intent === 'object' && intent !== null && 'setCode' in intent && 'idempotencyKey' in intent && 'revealed' in intent && typeof intent.setCode === 'string' && typeof intent.idempotencyKey === 'string' && typeof intent.revealed === 'number' && Number.isInteger(intent.revealed) && intent.revealed >= 0 && (!('openingId' in intent) || typeof intent.openingId === 'string')) void requestOpening(intent as Intent, false)
      }
    } catch { setStorageWarning('Reprise automatique indisponible. Consultez votre historique pour retrouver les cartes.') }
  }, [session?.user?.id, storageKey, requestOpening, loadHistory])
  useEffect(() => {
    if (!detail) return
    let active = true
    setFavorite(false); setFavoriteError('')
    void api<{ isFavorite: boolean }>(`/api/user/favorites/${encodeURIComponent(detail.id)}`).then(data => { if (active) setFavorite(Boolean(data.isFavorite)) }).catch(() => { if (active) setFavoriteError('Favoris indisponibles') })
    return () => { active = false }
  }, [detail])

  useEffect(() => {
    if (!requestedSet || busy || (opening && revealed < opening.cards.length)) return
    const matching = sets.find(set => set.code.replace(/[\s-]/g, '').toUpperCase() === requestedSet.replace(/[\s-]/g, '').toUpperCase())
    if (matching) setSelectedSet(matching.code)
  }, [requestedSet, sets, busy, opening, revealed])

  function reveal(count: number) {
    if (!opening) return
    vibrate()
    const next = Math.min(count, opening.cards.length)
    setRevealed(next); setAnimating(false)
    if (pending?.openingId === opening.id) { if (next >= opening.cards.length) forget(); else save({ ...pending, revealed: next }) }
    const card = opening.cards[next - 1]
    if (card && next === revealed + 1) {
      if (isVariant(card, 'alt')) audio.playAltArtSound()
      else if (rare(card)) audio.playUltraRareSound()
      else if (card.isNew) audio.playNewCardSound()
    }
  }
  async function requestBatch(intent: { setCode: string; idempotencyKey: string; count: 5 | 10 }) {
    if (flight.current) return
    flight.current = true; setBusy(true); setError(''); setBatchIntent(intent)
    try {
      const data = await api<{ openings: OpeningResult[] }>('/api/booster/open-batch', intent)
      setBatch(data.openings); setBatchSummary(false); setBatchIntent(null)
      setAnimating(!preferences.quickOpening && preferences.animations && !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      void loadHistory()
    } catch (e) { setError(e instanceof Error && e.name !== 'AbortError' ? e.message : 'Ouverture non confirmée. Réessayez pour récupérer le résultat.') }
    finally { flight.current = false; setBusy(false) }
  }
  function batchCard(card: OpeningCard) {
    vibrate()
    if (isVariant(card, 'alt')) audio.playAltArtSound()
    else if (rare(card)) audio.playUltraRareSound()
    else if (card.isNew) audio.playNewCardSound()
  }
  function startOpening() {
    if (flight.current || !chosen?.available || busy || (pending && !pending.openingId)) return
    if (batchCount > 1) {
      if (!preferences.animations || preferences.quickOpening || reducedMotion) audio.playPackOpenSound()
      setOpening(null); setBatch(null)
      void requestBatch({ setCode: selectedSet, idempotencyKey: crypto.randomUUID(), count: batchCount as 5 | 10 })
      return
    }
    // With the tear scene, the opening sound plays when the packet is torn (TearOpening onTear), not on this click.
    if (!preferences.animations || preferences.quickOpening || reducedMotion) audio.playPackOpenSound()
    setOpening(null); setRevealed(0); setShowResult(false)
    void requestOpening({ setCode: selectedSet, idempotencyKey: crypto.randomUUID(), revealed: 0 }, true)
  }
  function discardRejectedIntent() {
    if (!canDiscard || busy) return
    setPending(null); setError(''); setCanDiscard(false)
    if (storageKey) try { window.localStorage.removeItem(storageKey); window.sessionStorage.removeItem(storageKey) } catch { /* Receipt history remains available. */ }
  }
  async function viewHistory(id: string) {
    if (flight.current) return
    flight.current = true; setBusy(true); setError('')
    try { const data = await api<{ opening: OpeningResult }>(`/api/booster/openings/${encodeURIComponent(id)}`); setOpening(data.opening); setRevealed(data.opening.cards.length); setAnimating(false); setShowResult(true) }
    catch (e) { setError(e instanceof Error ? e.message : 'Ouverture indisponible') }
    finally { flight.current = false; setBusy(false) }
  }
  async function toggleFavorite() {
    if (!detail || favoriteBusy) return
    setFavoriteBusy(true); setFavoriteError('')
    try {
      const response = await fetch('/api/user/favorites', { method: favorite ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardId: detail.id }) })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error('Modification des favoris impossible')
      setFavorite(old => !old)
    } catch (e) { setFavoriteError(e instanceof Error ? e.message : 'Favoris indisponibles') }
    finally { setFavoriteBusy(false) }
  }

  if (status === 'loading') return <p className="p-12 text-center" role="status">Chargement de votre espace…</p>
  if (!session?.user) return <div className="p-12 text-center"><Link href="/login" className={button}>Connectez-vous pour ouvrir des boosters</Link></div>
  return <div className={`piece-page ${(opening && !showResult) || (batch && !batchSummary) ? 'piece-opening-immersive' : ''}`}>
    <div className="mx-auto max-w-none">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div><p className="mb-2 text-xs font-semibold tracking-[0.25em] text-amber-300">LA PROCHAINE CARTE VOUS ATTEND</p><h1 className="text-3xl font-bold sm:text-5xl">Ouvrez votre trésor.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">Choisissez une extension, découvrez vos cartes et enrichissez votre collection. Ouvertures gratuites du simulateur.</p></div>
        <button type="button" aria-label={soundsEnabled ? 'Désactiver les sons' : 'Activer les sons'} onClick={() => setSoundsEnabled(!soundsEnabled)} className={`${button} border border-slate-700 px-3`}>{soundsEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
      </div>
      {storageWarning && <p role="status" className="mb-4 rounded-xl bg-slate-800 p-4 text-sm">{storageWarning}</p>}
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-500/40 bg-red-950/40 p-4"><p>{error}</p>{batchIntent && <button type="button" disabled={busy} onClick={() => void requestBatch(batchIntent)} className={`${button} mt-3 bg-white text-slate-950`}>Réessayer ces {batchIntent.count} boosters</button>}{!batchIntent && pending && <button type="button" disabled={busy} onClick={() => void requestOpening(pending, false)} className={`${button} mt-3 bg-white text-slate-950`}>Réessayer cette ouverture</button>}{canDiscard && <button type="button" disabled={busy} onClick={discardRejectedIntent} className={`${button} mt-3 border border-slate-600`}>Choisir une autre extension</button>}</div>}
      {batch && <div className="bo-batch">{animating ? <TearOpening onTear={() => audio.playPackOpenSound()} returnHref={`/boosters?set=${encodeURIComponent(batch[0].setCode)}`} imageUrl={sets.find(set => set.code === batch[0].setCode)?.imageUrl || null} setName={`${batch[0].setName} · ${batch.length} boosters`} cardCount={batch.length * batch[0].cards.length} onComplete={() => setAnimating(false)} />
        : <BatchOpening key={batch[0].id} openings={batch} onSummary={showBatchSummary} onCard={batchCard} onDetail={setDetail} busy={busy} againLabel={`Ouvrir ${batch.length} autres boosters`} onAgain={() => { setBatch(null); startOpening() }} />}</div>}
      {!opening && !batch && <section className="bo-hero" aria-labelledby="extension-title">
        <div className="bo-hero-stage">
          <div className="bo-hero-glow" aria-hidden="true" />
          <div className="bo-hero-pack"><PackArt key={chosen?.code} testId="booster-artwork" src={chosen?.imageUrl} alt={`Booster ${chosen?.code || ''}`} eager /></div>
          {orderedSets.length > 1 && <><button type="button" className="bo-hero-arrow prev" aria-label="Extension précédente" disabled={busy || chosenIndex <= 0} onClick={() => setSelectedSet(orderedSets[chosenIndex - 1].code)}><ChevronLeft /></button>
            <button type="button" className="bo-hero-arrow next" aria-label="Extension suivante" disabled={busy || chosenIndex >= orderedSets.length - 1} onClick={() => setSelectedSet(orderedSets[chosenIndex + 1].code)}><ChevronRight /></button></>}
        </div>
        <div className="bo-hero-info">
          <Link href={`/boosters${chosen ? `?set=${encodeURIComponent(chosen.code)}` : ''}`} className="bo-back">← Retour aux boosters</Link>
          <h2 id="extension-title" className="sr-only">Confirmer votre ouverture</h2>
          {chosen ? <>
            <p className="bo-code">{chosen.code}<span className={`bo-pill ${chosen.available ? 'ok' : 'off'}`}>{chosen.available ? 'Disponible' : 'Indisponible'}</span></p>
            <h3 className="bo-title">{boosterTitle(chosen)}</h3>
            <div className="bo-stats"><div><strong>{chosen.cardCount}</strong><span>Cartes au catalogue</span></div><div><strong>{chosen.packSize ?? '—'}</strong><span>Cartes par booster</span></div></div>
            {chosen.description && <p className="bo-description">{chosen.description}</p>}
            {!chosen.available && <p role="status" className="bo-unavailable">{chosen.error}</p>}
          </> : <h3 className="bo-title">{catalogError || 'Chargement des extensions…'}</h3>}
          {catalogError && <p role="alert" className="bo-unavailable">{catalogError}</p>}
          <div className="bo-cta">
            <div className="bo-count" role="radiogroup" aria-label="Nombre de boosters">{([1, 5, 10] as const).map(n => <button key={n} type="button" role="radio" aria-checked={batchCount === n} className={batchCount === n ? 'on' : ''} disabled={busy} onClick={() => setBatchCount(n)}>×{n}</button>)}</div>
            <button type="button" onClick={startOpening} disabled={!chosen?.available || busy || Boolean(pending && !pending.openingId)} className="bo-open"><Sparkles size={20} />{busy ? 'Confirmation serveur…' : batchCount === 1 ? 'Ouvrir le booster' : `Ouvrir ${batchCount} boosters`}</button>
          </div>
          {chosen && <Link href={`/boosters/${encodeURIComponent(chosen.code)}`} className="bo-link">Voir toutes les cartes de l’extension <ArrowUpRight size={14} /></Link>}
        </div>
        <div className="bo-strip" role="group" aria-label="Changer d’extension">
          {orderedSets.filter(set => isBoosterProduct(set.code)).map(set => <button key={set.code} type="button" disabled={busy || Boolean(pending && !pending.openingId)} aria-pressed={set.code === selectedSet} className={`bo-strip-item${set.code === selectedSet ? ' on' : ''}${set.available ? '' : ' off'}`} onClick={() => setSelectedSet(set.code)} title={`${set.code} · ${boosterTitle(set)}`}>
            <PackArt src={set.imageUrl} alt="" /><span>{set.code}</span></button>)}
        </div>
        <div className="bo-extras">
          <details className="bo-change"><summary>Rechercher une extension</summary>
            <label htmlFor="set-search" className="sr-only">Rechercher une extension</label>
            <input id="set-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="OP-01, nom de l’extension…" />
            <label htmlFor="booster-set">Extension</label>
            <select id="booster-set" value={selectedSet} disabled={busy || Boolean(pending && !pending.openingId)} onChange={e => setSelectedSet(e.target.value)}>
              {!sets.length && <option value="">Chargement des extensions…</option>}
              {orderedSets.filter(set => set.code === selectedSet || `${set.code} ${set.name} ${boosterTitle(set)}`.toLowerCase().includes(query.toLowerCase())).map(set => <option key={set.code} value={set.code}>{set.code} · {boosterTitle(set)}{!set.available ? ' · indisponible' : ''}</option>)}
            </select>
          </details>
          {chosen?.rules && <div className="bo-odds"><BoosterOdds rules={chosen.rules} warnings={chosen.warnings} /></div>}
          <OpeningSettings />
        </div>
      </section>}
      {opening && <div className={`piece-opening-layout grid gap-6 lg:grid-cols-[300px_1fr] ${opening && !showResult ? 'is-cinematic' : 'is-result'}`}>
        <section aria-labelledby="extension-title" className="piece-panel">
          <Link href="/boosters" className="piece-muted">← Retour aux boosters</Link><h2 className="my-5 text-lg font-semibold">Confirmer votre ouverture</h2>
          <details className="mb-4"><summary className="min-h-11 cursor-pointer text-sm">Changer d’extension</summary>
          <label htmlFor="set-search" className="mb-2 block text-sm text-slate-300">Rechercher une extension</label>
          <input id="set-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="OP-01, nom de l’extension…" className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm" />
          <label htmlFor="booster-set" className="mb-2 block text-sm text-slate-300">Extension</label>
          <select id="booster-set" value={selectedSet} disabled={busy || Boolean(pending && !pending.openingId)} onChange={e => setSelectedSet(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm">
            {!sets.length && <option value="">Chargement des extensions…</option>}
            {sets.filter(set => set.code === selectedSet || `${set.code} ${set.name}`.toLowerCase().includes(query.toLowerCase())).map(set => <option key={set.code} value={set.code}>{set.code} · {set.name}{!set.available ? ' · indisponible' : ''}</option>)}
          </select>
          </details>
          {catalogError && <p role="alert" className="mt-4 text-red-300">{catalogError}</p>}

          <div className="my-7 motion-safe:transition-transform motion-safe:hover:-rotate-3"><BoosterArtwork key={chosen?.code} testId="booster-artwork" src={chosen?.imageUrl} alt={`Booster ${chosen?.code || ''}`} /></div>
          {chosen && <><p className="piece-eyebrow">{chosen.code}</p><h3 className="font-semibold">{chosen.name}</h3><p className="mt-2 text-sm text-slate-400">{chosen.cardCount} cartes dans le catalogue{chosen.packSize ? ` · ${chosen.packSize} cartes par ouverture` : ''}</p>{chosen.description && <p className="mt-2 text-sm text-slate-400">{chosen.description}</p>}{!chosen.available && <p role="status" className="mt-4 rounded-xl bg-amber-950/40 p-3 text-sm text-amber-200">{chosen.error}</p>}</>}
          <button type="button" onClick={startOpening} disabled={!chosen?.available || busy || Boolean(pending && !pending.openingId) || Boolean(opening && !showResult)} className={`${button} mt-6 w-full bg-amber-300 text-slate-950 hover:bg-amber-200`}><Sparkles size={18} />{busy ? 'Confirmation serveur…' : opening ? 'Ouvrir un autre booster' : 'Ouvrir le booster'}</button>
          {chosen?.rules && <BoosterOdds rules={chosen.rules} warnings={chosen.warnings} />}
          <OpeningSettings />
        </section>
        <section aria-label="Résultat de l’ouverture" className={`piece-panel piece-opening-result min-w-0 ${!opening ? 'piece-opening-empty' : ''}`}>
          {!opening ? <div className="flex min-h-96 flex-col items-center justify-center text-center"><Sparkles className="mb-5 text-amber-300" size={40} /><h2 className="text-2xl font-semibold">Une nouvelle découverte</h2><p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">Vos cartes sont ajoutées à la collection dès que le serveur confirme l’ouverture. Prenez ensuite le temps de les découvrir.</p></div> : <>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">{showResult ? 'Booster ouvert !' : opening.setName}</h2><p className="mt-1 text-sm text-slate-400">{opening.setName} · {opening.setCode} · {new Date(opening.openedAt).toLocaleString('fr-FR')}</p></div>{opening.specialPack && <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-bold text-slate-950">{opening.specialPack}</span>}</div>
            <p role="status" data-testid="collection-confirmation" className={`mb-5 flex items-start gap-2 rounded-xl p-3 text-sm ${opening.creditedAt ? 'bg-emerald-900/25 text-emerald-300' : 'bg-amber-900/25 text-amber-200'}`}><Check size={18} className="shrink-0" />{opening.creditedAt ? `${opening.cards.length} cartes ajoutées à votre collection · ${opening.newCardsCount} nouvelles cartes.` : 'Ouverture historique : ajout à la collection non vérifiable. Aucune nouvelle attribution.'}</p>
            {animating ? <TearOpening onTear={() => audio.playPackOpenSound()} returnHref={`/boosters?set=${encodeURIComponent(opening.setCode)}`} imageUrl={openedSet?.imageUrl || null} setName={opening.setName} cardCount={opening.cards.length} onComplete={() => setAnimating(false)} /> : !showResult ? <StackReveal key={opening.id} opening={opening} revealed={revealed} onReveal={reveal} onComplete={() => { reveal(opening.cards.length); setShowResult(true) }} /> : <div className="piece-opening-cards grid grid-cols-2 gap-4 sm:grid-cols-3">
              {opening.cards.map((card, index) => <div key={`${opening.id}-${index}`} data-testid="draw-slot" className="min-w-0 bo-deal" style={{ '--deal': index } as React.CSSProperties}>
                {(showResult || index < revealed) ? <button type="button" onClick={() => setDetail(card)} aria-label={`Détails de ${card.name}, carte ${index + 1}`} data-effect={openingEffect(card)} className={`${styles.cardReveal} piece-opening-card w-full rounded-xl border-2 p-1 text-left motion-safe:transition-transform motion-safe:hover:-translate-y-1 ${rare(card) ? 'border-amber-300/70 shadow-lg shadow-amber-500/10' : 'border-slate-700'}`}><CardImage card={card} /><span className="mt-2 block truncate px-1 text-xs font-medium">{card.name}</span><span className="mt-1 flex flex-wrap gap-1 px-1 pb-1 text-[10px]"><span className={rare(card) ? 'text-amber-200' : 'text-slate-400'}>{card.rarity}{isVariant(card, 'alt') ? ' · Alternative' : ''}{isVariant(card, 'parallel') ? ' · Parallèle' : ''}{isVariant(card, 'special') ? ' · Spéciale' : ''}</span>{card.isDuplicate !== null && <span className={card.isDuplicate ? 'text-slate-400' : 'text-emerald-300'}>{card.isDuplicate ? `Doublon · ${card.quantityBefore} déjà possédée(s)` : 'Nouvelle !'}</span>}</span></button> : <button type="button" disabled={busy} onClick={() => reveal(index + 1)} aria-label={`Révéler jusqu’à la carte ${index + 1}`} className="relative w-full rounded-xl border-2 border-slate-800 p-1"><Image src="/images/card-back.jpg" alt="Carte à découvrir" width={300} height={420} sizes="(max-width: 640px) 44vw, 220px" className="h-auto w-full rounded-lg opacity-60" /><span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-amber-200">{index + 1}</span></button>}
              </div>)}
            </div>}
            {showResult && <div className="grid grid-cols-3 gap-2 my-5 text-center text-sm"><div className="piece-panel !p-3"><strong>{opening.newCardsCount ?? '—'}</strong><p>Nouvelles cartes</p></div><div className="piece-panel !p-3"><strong>{opening.legacy ? '—' : opening.cards.filter(c => c.isDuplicate).length}</strong><p>Déjà possédées</p></div><div className="piece-panel !p-3"><strong>{opening.cards.filter(c => rare(c) || ['R', 'RARE'].includes(c.rarity.toUpperCase())).length}</strong><p>Cartes rares+</p></div></div>}
            {showResult && <div className="sticky bottom-3 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-950/95 p-3 backdrop-blur"><p aria-live="polite" className="text-sm text-slate-300">{revealed} / {opening.cards.length} cartes révélées</p>{revealed < opening.cards.length ? <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => reveal(opening.cards.length)} className={`${button} border border-slate-600 px-3`}>Tout révéler</button><button type="button" disabled={busy} onClick={() => reveal(revealed + 1)} className={`${button} bg-amber-300 px-3 text-slate-950`}>Carte suivante <ChevronRight size={16} /></button></div> : <div className="piece-actions"><button type="button" disabled={busy || !chosen?.available} onClick={startOpening} className={`${button} secondary`}>Ouvrir un autre booster</button><Link href="/collection" className={button}>Voir ma collection <ChevronRight size={16} /></Link></div>}</div>}
          </>}
        </section>
      
      </div>}
      <section hidden={Boolean((opening && !showResult) || batch)} aria-labelledby="history-title" className="mt-9 rounded-3xl border border-slate-800 p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="history-title" className="flex items-center gap-2 text-xl font-semibold"><History size={21} /> Vos ouvertures</h2><button type="button" disabled={historyBusy} onClick={() => void loadHistory()} className={`${button} bg-slate-800`}>Actualiser l’historique</button></div>
        {historyError && <p role="alert" className="text-red-300">{historyError}</p>}
        {!history.length && <p className="text-sm text-slate-400">{historyBusy ? 'Chargement…' : 'Votre prochaine ouverture sera enregistrée ici.'}</p>}
        <ul className="divide-y divide-slate-800">{history.map(row => <li key={row.id}><button type="button" disabled={busy} onClick={() => void viewHistory(row.id)} className="flex w-full items-center justify-between gap-4 py-4 text-left"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{row.setCode} · {row.setName}</span><span className="mt-1 block text-xs text-slate-400">{new Date(row.openedAt).toLocaleString('fr-FR')} · {row.cardCount} cartes{!row.creditedAt ? ' · historique ancien' : ''}</span></span><ChevronRight size={18} className="shrink-0 text-amber-300" /></button></li>)}</ul>
        {cursor && <button type="button" disabled={historyBusy} onClick={() => void loadHistory(cursor)} className={`${button} mt-4 bg-slate-800`}>Ouvertures précédentes</button>}
      </section>
      <Dialog open={Boolean(detail)} onOpenChange={open => { if (!open) setDetail(null) }}><DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto rounded-2xl border-slate-700 bg-slate-950 text-slate-100 motion-reduce:animate-none">{detail && <><DialogTitle>{detail.name}</DialogTitle><DialogDescription>{detail.code} · {detail.rarity} · {detail.color}</DialogDescription><div className="mx-auto w-52"><CardImage card={detail} /></div><p className="text-sm">{detail.type} · Coût : {detail.cost}{detail.power !== null ? ` · Puissance : ${detail.power}` : ''}{detail.counter ? ` · Contre : ${detail.counter}` : ''}</p>{detail.effect && <p className="text-sm leading-6">{detail.effect}</p>}{detail.trigger && <p className="text-sm text-amber-200">Trigger : {detail.trigger}</p>}<button type="button" disabled={favoriteBusy} onClick={() => void toggleFavorite()} className={`${button} border border-slate-700`}>{favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</button>{favoriteError && <p role="alert" className="text-sm text-red-300">{favoriteError}</p>}</>}</DialogContent></Dialog>
    </div>
  </div>
}
