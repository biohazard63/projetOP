'use client'
import { useEffect, useReducer, useState } from 'react'
import { emptyPresentationQueue, presentationReducer } from './presentationQueue'
import { presentationDuration } from './presentationTiming'

export function usePresentationQueue(reduced: boolean, fast: boolean) {
  const [queue, dispatch] = useReducer(presentationReducer, undefined, emptyPresentationQueue)
  const [paused, setPaused] = useState(false)
  useEffect(() => { setPaused(false) }, [queue.gameId])
  useEffect(() => {
    if (reduced) { setPaused(false); dispatch({ type: 'CLEAR' }); return }
    if (!queue.active || paused) return
    const key = queue.active.key
    const timer = setTimeout(() => dispatch({ type: 'NEXT', gameId: queue.gameId, key }), presentationDuration(queue.active.duration, fast))
    return () => clearTimeout(timer)
  }, [queue.active, queue.gameId, reduced, fast, paused])
  return { dispatch, paused, togglePause: () => setPaused(value => !value), step: reduced ? null : queue.active, skip: () => { setPaused(false); if (queue.active) dispatch({ type: 'NEXT', gameId: queue.gameId, key: queue.active.key }) },
    clear: () => { setPaused(false); dispatch({ type: 'CLEAR' }) }, reset: () => { setPaused(false); dispatch({ type: 'RESET' }) } }
}
