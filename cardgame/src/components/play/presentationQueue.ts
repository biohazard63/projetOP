import type { AnimStep } from './anim'

export type PresentationQueue = { gameId: string | null; active: AnimStep | null; pending: AnimStep[]; knownKeys: string[] }
export type PresentationAction = { type: 'ENQUEUE'; gameId: string; steps: AnimStep[] } | { type: 'NEXT'; gameId: string | null; key: string } | { type: 'CLEAR' } | { type: 'RESET' }
export const emptyPresentationQueue = (): PresentationQueue => ({ gameId: null, active: null, pending: [], knownKeys: [] })

/** No engine state, timers, network calls or decisions. A completion from an old animation cannot finish a newer one. */
export function presentationReducer(state: PresentationQueue, action: PresentationAction): PresentationQueue {
  if (action.type === 'RESET') return emptyPresentationQueue()
  if (action.type === 'CLEAR') return { ...state, active: null, pending: [] }
  if (action.type === 'NEXT') {
    if (state.gameId !== action.gameId || state.active?.key !== action.key) return state
    return { ...state, active: state.pending[0] ?? null, pending: state.pending.slice(1) }
  }
  const current = state.gameId === action.gameId ? state : { ...emptyPresentationQueue(), gameId: action.gameId }
  const known = new Set(current.knownKeys), fresh: AnimStep[] = []
  for (const step of action.steps) if (!known.has(step.key)) { known.add(step.key); fresh.push(step) }
  const pending = [...current.pending, ...fresh]
  return { ...current, active: current.active ?? pending[0] ?? null, pending: current.active ? pending : pending.slice(1), knownKeys: [...known] }
}
