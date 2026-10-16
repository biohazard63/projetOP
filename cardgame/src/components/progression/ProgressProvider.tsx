'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { Award, Crown, Lock, Sparkles } from 'lucide-react'
import type { ProgressView, Unlock } from '@/lib/progression/service'

const SYNC = 'progress:sync'
/** Ask for a progress sync (after an opening, a game, a resale…). Debounced; rewards arrive with the unlock banners. */
export const requestProgressSync = () => window.dispatchEvent(new Event(SYNC))

const Context = createContext<{ progress: ProgressView | null; sync: () => void }>({ progress: null, sync: () => undefined })
export const useProgress = () => useContext(Context)

/** Keeps the player's level and badges, syncs them after each action and shows a banner for every unlock. */
export function ProgressProvider({ children }: { children: ReactNode }) {
  const { status } = useSession()
  const [progress, setProgress] = useState<ProgressView | null>(null)
  const [queue, setQueue] = useState<Unlock[]>([])
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null), running = useRef(false)
  const run = useCallback(async () => {
    if (running.current) return
    running.current = true
    try {
      const response = await fetch('/api/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      if (!response.ok) return
      const data = await response.json() as { unlocks: Unlock[]; progress: ProgressView }
      setProgress(data.progress)
      if (data.unlocks.length) { setQueue(q => [...q, ...data.unlocks]); window.dispatchEvent(new Event('berries:changed')) }
    } catch { /* next action retries */ } finally { running.current = false }
  }, [])
  const sync = useCallback(() => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => void run(), 900) }, [run])
  useEffect(() => {
    if (status !== 'authenticated') { setProgress(null); return }
    void run()
    window.addEventListener(SYNC, sync)
    return () => window.removeEventListener(SYNC, sync)
  }, [status, run, sync])
  useEffect(() => {
    if (!queue.length) return
    const t = setTimeout(() => setQueue(q => q.slice(1)), queue[0].kind === 'level' || queue[0].title ? 4200 : 3200)
    return () => clearTimeout(t)
  }, [queue])
  const current = queue[0]
  return <Context.Provider value={{ progress, sync }}>
    {children}
    {current && <div key={`${current.kind}-${current.id}-${current.label}-${queue.length}`} className={`pg-unlock ${current.kind}`} role="status" aria-live="polite" onClick={() => setQueue(q => q.slice(1))}>
      <span className="pg-unlock-icon">{current.kind === 'level' ? <Crown size={22} /> : current.kind === 'secret' ? <Lock size={20} /> : <Award size={22} />}</span>
      <span className="pg-unlock-text">
        <small>{current.kind === 'level' ? 'Niveau supérieur !' : current.kind === 'secret' ? 'Badge secret débloqué !' : 'Badge débloqué !'}</small>
        <b>{current.kind === 'level' ? `${current.name} · ${current.label}` : `${current.name} · ${current.label}`}</b>
        {current.title && <em><Sparkles size={12} /> Titre « {current.title} »</em>}
      </span>
      <span className="pg-unlock-gain">+{current.berries.toLocaleString('fr-FR')} ฿</span>
      {queue.length > 1 && <span className="pg-unlock-more">+{queue.length - 1}</span>}
    </div>}
  </Context.Provider>
}
