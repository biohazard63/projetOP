'use client'

import BoosterArtwork from './BoosterArtwork'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { Check, ChevronRight, History, Sparkles, Volume2, VolumeX } from 'lucide-react'
import { useAudio, useSoundSetting } from '@/hooks/useAudio'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { BoosterCatalogItem, OpeningCard, OpeningResult } from '@/lib/boosters/types'
import styles from './BoosterExperience.module.css'

type Intent = { setCode: string; idempotencyKey: string; openingId?: string; revealed: number }
type HistoryRow = { id: string; setName: string; setCode: string; openedAt: string; creditedAt: string | null; cardCount: number }
const button = 'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300 disabled:cursor-not-allowed disabled:opacity-40'
const rare = (card: OpeningCard) => ['SR', 'SEC', 'SP', 'SP CARD', 'SR SP', 'TR'].includes(card.rarity.toUpperCase()) || card.isAltArt || card.isParallel || card.isSpecial
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
  const flight = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resumedUser = useRef<string | null>(null)
  const storageKey = session?.user?.id ? `op:booster:${session.user.id}` : null
  const chosen = sets.find(set => set.code === selectedSet)
  const openedSet = sets.find(set => set.code === opening?.setCode)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(preference.matches)
    update(); preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  useEffect(() => { if (reducedMotion) setAnimating(false) }, [reducedMotion])

  const save = useCallback((intent: Intent) => {
    setPending(intent)
    if (storageKey) try { window.sessionStorage.setItem(storageKey, JSON.stringify(intent)) } catch { setStorageWarning('La reprise automatique est indisponible dans ce navigateur. Votre ouverture reste dans l’historique.') }
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
      const count = Math.min(intent.revealed, data.opening.cards.length)
      setOpening(data.opening); setSelectedSet(data.opening.setCode); setRevealed(count)
      save({ ...intent, openingId: data.opening.id, revealed: count })
      const shouldAnimate = animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      setAnimating(shouldAnimate)
      if (shouldAnimate) timer.current = setTimeout(() => setAnimating(false), 900)
      void loadHistory()
    } catch (e) {
      setError(e instanceof Error && e.name !== 'AbortError' ? e.message : 'Ouverture non confirmée. Réessayez cette ouverture pour récupérer le résultat.')
      setCanDiscard(!intent.openingId && e instanceof ApiError && [400, 422].includes(e.status))
    }
    finally { flight.current = false; setBusy(false) }
  }, [save, loadHistory])

  useEffect(() => {
    if (!session?.user?.id || resumedUser.current === session.user.id) return
    resumedUser.current = session.user.id
    void api<{ sets: BoosterCatalogItem[] }>('/api/booster').then(data => {
      setSets(data.sets); setSelectedSet(old => old || data.sets.find(set => set.code === 'OP-TEST' && set.available)?.code || data.sets.find(set => set.available)?.code || data.sets[0]?.code || '')
    }).catch(e => setCatalogError(e instanceof Error ? e.message : 'Extensions indisponibles'))
    void loadHistory()
    try {
      const stored = storageKey && window.sessionStorage.getItem(storageKey)
      if (stored) {
        const intent: unknown = JSON.parse(stored)
        if (typeof intent === 'object' && intent !== null && 'setCode' in intent && 'idempotencyKey' in intent && 'revealed' in intent && typeof intent.setCode === 'string' && typeof intent.idempotencyKey === 'string' && typeof intent.revealed === 'number' && Number.isInteger(intent.revealed) && intent.revealed >= 0 && (!('openingId' in intent) || typeof intent.openingId === 'string')) void requestOpening(intent as Intent, false)
      }
    } catch { setStorageWarning('Reprise automatique indisponible. Consultez votre historique pour retrouver les cartes.') }
  }, [session?.user?.id, storageKey, requestOpening, loadHistory])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  useEffect(() => {
    if (!detail) return
    let active = true
    setFavorite(false); setFavoriteError('')
    void api<{ isFavorite: boolean }>(`/api/user/favorites/${encodeURIComponent(detail.id)}`).then(data => { if (active) setFavorite(Boolean(data.isFavorite)) }).catch(() => { if (active) setFavoriteError('Favoris indisponibles') })
    return () => { active = false }
  }, [detail])

  function reveal(count: number) {
    if (!opening) return
    const next = Math.min(count, opening.cards.length)
    setRevealed(next); setAnimating(false)
    if (pending?.openingId === opening.id) save({ ...pending, revealed: next })
    const card = opening.cards[next - 1]
    if (card && next === revealed + 1) {
      if (card.isAltArt) audio.playAltArtSound()
      else if (rare(card)) audio.playUltraRareSound()
      else if (card.isNew) audio.playNewCardSound()
    }
  }
  function startOpening() {
    if (!chosen?.available || busy || (pending && !pending.openingId)) return
    audio.playPackOpenSound()
    setOpening(null); setRevealed(0)
    void requestOpening({ setCode: selectedSet, idempotencyKey: crypto.randomUUID(), revealed: 0 }, true)
  }
  function discardRejectedIntent() {
    if (!canDiscard || busy) return
    setPending(null); setError(''); setCanDiscard(false)
    if (storageKey) try { window.sessionStorage.removeItem(storageKey) } catch { /* Receipt history remains available. */ }
  }
  async function viewHistory(id: string) {
    if (flight.current) return
    flight.current = true; setBusy(true); setError('')
    try { const data = await api<{ opening: OpeningResult }>(`/api/booster/openings/${encodeURIComponent(id)}`); setOpening(data.opening); setRevealed(data.opening.cards.length); setAnimating(false) }
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
  return <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-8 sm:py-12">
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div><p className="mb-2 text-xs font-semibold tracking-[0.25em] text-amber-300">LA PROCHAINE CARTE VOUS ATTEND</p><h1 className="text-3xl font-bold sm:text-5xl">Ouvrez votre trésor.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">Choisissez une extension, découvrez vos cartes et enrichissez votre collection. Ouvertures gratuites du simulateur.</p></div>
        <button type="button" aria-label={soundsEnabled ? 'Désactiver les sons' : 'Activer les sons'} onClick={() => setSoundsEnabled(!soundsEnabled)} className={`${button} border border-slate-700 px-3`}>{soundsEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
      </div>
      {storageWarning && <p role="status" className="mb-4 rounded-xl bg-slate-800 p-4 text-sm">{storageWarning}</p>}
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-500/40 bg-red-950/40 p-4"><p>{error}</p>{pending && <button type="button" disabled={busy} onClick={() => void requestOpening(pending, false)} className={`${button} mt-3 bg-white text-slate-950`}>Réessayer cette ouverture</button>}{canDiscard && <button type="button" disabled={busy} onClick={discardRejectedIntent} className={`${button} mt-3 border border-slate-600`}>Choisir une autre extension</button>}</div>}
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <section aria-labelledby="extension-title" className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 id="extension-title" className="mb-5 text-lg font-semibold">Votre prochaine escale</h2>
          <label htmlFor="set-search" className="mb-2 block text-sm text-slate-300">Rechercher une extension</label>
          <input id="set-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="OP-01, nom de l’extension…" className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm" />
          <label htmlFor="booster-set" className="mb-2 block text-sm text-slate-300">Extension</label>
          <select id="booster-set" value={selectedSet} disabled={busy || Boolean(pending && !pending.openingId)} onChange={e => setSelectedSet(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm">
            {!sets.length && <option value="">Chargement des extensions…</option>}
            {sets.filter(set => set.code === selectedSet || `${set.code} ${set.name}`.toLowerCase().includes(query.toLowerCase())).map(set => <option key={set.code} value={set.code}>{set.code} · {set.name}{!set.available ? ' · indisponible' : ''}</option>)}
          </select>
          {catalogError && <p role="alert" className="mt-4 text-red-300">{catalogError}</p>}
          <button type="button" onClick={startOpening} disabled={!chosen?.available || busy || Boolean(pending && !pending.openingId) || Boolean(opening && revealed < opening.cards.length)} className={`${button} mt-6 w-full bg-amber-300 text-slate-950 hover:bg-amber-200`}><Sparkles size={18} />{busy ? 'Confirmation serveur…' : opening ? 'Ouvrir un autre booster' : 'Ouvrir le booster'}</button>
          <div className="my-7 motion-safe:transition-transform motion-safe:hover:-rotate-3"><BoosterArtwork key={chosen?.code} testId="booster-artwork" src={chosen?.imageUrl} alt={`Booster ${chosen?.code || ''}`} /></div>
          {chosen && <><h3 className="font-semibold">{chosen.name}</h3><p className="mt-2 text-sm text-slate-400">{chosen.cardCount} cartes dans le catalogue{chosen.packSize ? ` · ${chosen.packSize} cartes par ouverture` : ''}</p>{chosen.description && <p className="mt-2 text-sm text-slate-400">{chosen.description}</p>}{!chosen.available && <p role="status" className="mt-4 rounded-xl bg-amber-950/40 p-3 text-sm text-amber-200">{chosen.error}</p>}</>}
          {chosen?.rules && <details className="mt-5 text-xs leading-5 text-slate-400"><summary className="cursor-pointer text-slate-300">Composition et probabilités</summary><p className="my-2">{chosen.rules.source}. Ces taux ne sont pas présentés comme des taux officiels.</p><ol className="list-inside list-decimal">{chosen.rules.slots.map((slot, i) => <li key={i}>{slot.choices.map(choice => `${choice.rarity}${choice.variant !== 'any' ? ` (${choice.variant})` : ''} : ${(100 * choice.weight / slot.choices.reduce((sum, item) => sum + item.weight, 0)).toFixed(1)} %`).join(' · ')}</li>)}</ol>{chosen.rules.specialPacks.map(pack => <p key={pack.label}>{pack.label} : {(pack.probability * 100).toFixed(1)} % des packs ; composition spéciale remplaçant les slots ci-dessus.</p>)}{chosen.warnings.map(warning => <p key={warning} className="mt-2">{warning}</p>)}</details>}
        </section>
        <section aria-label="Résultat de l’ouverture" className="min-w-0 rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-5 sm:p-7">
          {!opening ? <div className="flex min-h-96 flex-col items-center justify-center text-center"><Sparkles className="mb-5 text-amber-300" size={40} /><h2 className="text-2xl font-semibold">Une nouvelle découverte</h2><p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">Vos cartes sont ajoutées à la collection dès que le serveur confirme l’ouverture. Prenez ensuite le temps de les découvrir.</p></div> : <>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">{opening.setName}</h2><p className="mt-1 text-sm text-slate-400">{opening.setCode} · {new Date(opening.openedAt).toLocaleString('fr-FR')}</p></div>{opening.specialPack && <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-bold text-slate-950">{opening.specialPack}</span>}</div>
            <p role="status" data-testid="collection-confirmation" className={`mb-5 flex items-start gap-2 rounded-xl p-3 text-sm ${opening.creditedAt ? 'bg-emerald-900/25 text-emerald-300' : 'bg-amber-900/25 text-amber-200'}`}><Check size={18} className="shrink-0" />{opening.creditedAt ? `${opening.cards.length} cartes ajoutées à votre collection · ${opening.newCardsCount} nouvelles cartes.` : 'Ouverture historique : ajout à la collection non vérifiable. Aucune nouvelle attribution.'}</p>
            {animating ? <div data-testid="pack-animation" className="flex min-h-80 items-center justify-center"><div className={styles.packOpening}><BoosterArtwork key={opening.setCode} src={openedSet?.imageUrl} alt={`Ouverture du booster ${opening.setCode} en cours`} /></div></div> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {opening.cards.map((card, index) => <div key={`${opening.id}-${index}`} data-testid="draw-slot" className="min-w-0">
                {index < revealed ? <button type="button" onClick={() => setDetail(card)} aria-label={`Détails de ${card.name}, carte ${index + 1}`} className={`${styles.cardReveal} w-full rounded-xl border-2 p-1 text-left motion-safe:transition-transform motion-safe:hover:-translate-y-1 ${rare(card) ? 'border-amber-300/70 shadow-lg shadow-amber-500/10' : 'border-slate-700'}`}><CardImage card={card} /><span className="mt-2 block truncate px-1 text-xs font-medium">{card.name}</span><span className="mt-1 flex flex-wrap gap-1 px-1 pb-1 text-[10px]"><span className={rare(card) ? 'text-amber-200' : 'text-slate-400'}>{card.rarity}{card.isAltArt ? ' · Alternative' : ''}{card.isParallel ? ' · Parallèle' : ''}{card.isSpecial ? ' · Spéciale' : ''}</span>{card.isDuplicate !== null && <span className={card.isDuplicate ? 'text-slate-400' : 'text-emerald-300'}>{card.isDuplicate ? `Doublon · ${card.quantityBefore} déjà possédée(s)` : 'Nouvelle !'}</span>}</span></button> : <button type="button" disabled={busy} onClick={() => reveal(index + 1)} aria-label={`Révéler jusqu’à la carte ${index + 1}`} className="relative w-full rounded-xl border-2 border-slate-800 p-1"><Image src="/images/card-back.jpg" alt="Carte à découvrir" width={300} height={420} sizes="(max-width: 640px) 44vw, 220px" className="h-auto w-full rounded-lg opacity-60" /><span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-amber-200">{index + 1}</span></button>}
              </div>)}
            </div>}
            <div className="sticky bottom-3 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-950/95 p-3 backdrop-blur"><p aria-live="polite" className="text-sm text-slate-300">{revealed} / {opening.cards.length} cartes révélées</p>{revealed < opening.cards.length ? <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => reveal(opening.cards.length)} className={`${button} border border-slate-600 px-3`}>Tout révéler</button><button type="button" disabled={busy} onClick={() => reveal(revealed + 1)} className={`${button} bg-amber-300 px-3 text-slate-950`}>Carte suivante <ChevronRight size={16} /></button></div> : <Link href="/collection" className={`${button} bg-slate-800`}>Voir ma collection <ChevronRight size={16} /></Link>}</div>
          </>}
        </section>
      </div>
      <section aria-labelledby="history-title" className="mt-9 rounded-3xl border border-slate-800 p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="history-title" className="flex items-center gap-2 text-xl font-semibold"><History size={21} /> Vos ouvertures</h2><button type="button" disabled={historyBusy} onClick={() => void loadHistory()} className={`${button} bg-slate-800`}>Actualiser l’historique</button></div>
        {historyError && <p role="alert" className="text-red-300">{historyError}</p>}
        {!history.length && <p className="text-sm text-slate-400">{historyBusy ? 'Chargement…' : 'Votre prochaine ouverture sera enregistrée ici.'}</p>}
        <ul className="divide-y divide-slate-800">{history.map(row => <li key={row.id}><button type="button" disabled={busy} onClick={() => void viewHistory(row.id)} className="flex w-full items-center justify-between gap-4 py-4 text-left"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{row.setCode} · {row.setName}</span><span className="mt-1 block text-xs text-slate-400">{new Date(row.openedAt).toLocaleString('fr-FR')} · {row.cardCount} cartes{!row.creditedAt ? ' · historique ancien' : ''}</span></span><ChevronRight size={18} className="shrink-0 text-amber-300" /></button></li>)}</ul>
        {cursor && <button type="button" disabled={historyBusy} onClick={() => void loadHistory(cursor)} className={`${button} mt-4 bg-slate-800`}>Ouvertures précédentes</button>}
      </section>
      <Dialog open={Boolean(detail)} onOpenChange={open => { if (!open) setDetail(null) }}><DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto rounded-2xl border-slate-700 bg-slate-950 text-slate-100 motion-reduce:animate-none">{detail && <><DialogTitle>{detail.name}</DialogTitle><DialogDescription>{detail.code} · {detail.rarity} · {detail.color}</DialogDescription><div className="mx-auto w-52"><CardImage card={detail} /></div><p className="text-sm">{detail.type} · Coût : {detail.cost}{detail.power !== null ? ` · Puissance : ${detail.power}` : ''}{detail.counter ? ` · Contre : ${detail.counter}` : ''}</p>{detail.effect && <p className="text-sm leading-6">{detail.effect}</p>}{detail.trigger && <p className="text-sm text-amber-200">Trigger : {detail.trigger}</p>}<button type="button" disabled={favoriteBusy} onClick={() => void toggleFavorite()} className={`${button} border border-slate-700`}>{favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</button>{favoriteError && <p role="alert" className="text-sm text-red-300">{favoriteError}</p>}</>}</DialogContent></Dialog>
    </div>
  </main>
}
