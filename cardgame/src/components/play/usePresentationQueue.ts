'use client'
import { useEffect, useReducer, useRef, useState } from 'react'
import { emptyPresentationQueue, presentationReducer } from './presentationQueue'
import { presentationDuration, readingTimeout, type ReadingMode } from './presentationTiming'

// Reading popups (card text) follow the reading mode and stay shown with reduced motion: only movement is skipped, never
// information. Hovering or touching a reading popup holds it; "Continuer" moves on.
export function usePresentationQueue(reduced: boolean, fast: boolean, reading: ReadingMode = 'auto') {
  const [queue, dispatch] = useReducer(presentationReducer, undefined, emptyPresentationQueue)
  const [paused, setPaused] = useState(false)
  const [held, setHeld] = useState(false)
  const left = useRef<{ key: string; ms: number } | null>(null) // time left of the active step after a pause
  useEffect(() => { setPaused(false); setHeld(false) }, [queue.gameId])
  useEffect(() => { setHeld(false) }, [queue.active?.key])
  useEffect(() => {
    const active = queue.active
    if (!active || paused || held) return
    const key = active.key, next = () => dispatch({ type: 'NEXT', gameId: queue.gameId, key })
    if (!active.reading && reduced) { next(); return }
    const full = active.reading ? readingTimeout(active.duration, reading) : presentationDuration(active.duration, fast)
    if (full === null) return
    const ms = left.current?.key === key ? left.current.ms : full, started = Date.now()
    const timer = setTimeout(() => { left.current = null; next() }, ms)
    return () => { clearTimeout(timer); left.current = { key, ms: Math.max(0, ms - (Date.now() - started)) } }
  }, [queue.active, queue.gameId, reduced, fast, reading, paused, held])
  const step = reduced && !queue.active?.reading ? null : queue.active
  return { dispatch, paused: paused || held, togglePause: () => setPaused(value => !value), hold: setHeld, step,
    skip: () => { setPaused(false); setHeld(false); if (queue.active) dispatch({ type: 'NEXT', gameId: queue.gameId, key: queue.active.key }) },
    clear: () => { setPaused(false); setHeld(false); dispatch({ type: 'CLEAR' }) }, reset: () => { setPaused(false); setHeld(false); dispatch({ type: 'RESET' }) } }
}
