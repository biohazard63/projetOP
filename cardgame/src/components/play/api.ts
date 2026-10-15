import type { PlayerView } from '@/lib/engine/view'

/** The bot's deck: drawn at random by the server among the playable decks, or a chosen reference/Starter deck. */
export type Opponent = 'random' | { kind: 'reference'; id: string }

// Browser client of /api/play/*. It only ever sends intents with an idempotent command id and the version the
// player saw; the seat is decided by the server from the session.
export type View = PlayerView
export type DeckOption = { id: string; name: string; ok: boolean; errors: string[]; leader?: string; leaderName?: string; colors?: string[]; language?: 'fr' | 'en'; description?: string
  cards?: { number: string; name: string; category: string; cost: number | null; quantity: number; image?: string | null }[] }
export type DeckList = { reference: DeckOption[]; user: DeckOption[]; collection?: { owned: number; recognised: number; certified: number } }
export type BotLevel = 'easy' | 'normal' | 'hard'
export type Stats = { played: number; wins: number; losses: number; concessions: number; byDeck: Record<string, { played: number; wins: number }>; byLevel: Record<string, { played: number; wins: number }> }
export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string; detail?: Record<string, unknown> }

async function call<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, { ...init, cache: 'no-store', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) return { ok: false, status: response.status, error: typeof body?.error === 'string' ? body.error : 'SERVER_ERROR', detail: body }
    return { ok: true, data: body as T }
  } catch {
    return { ok: false, status: 0, error: 'NETWORK' }
  }
}
const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `c-${Date.now()}-${Math.random().toString(36).slice(2)}`)
export const playApi = {
  decks: () => call<DeckList>('/api/play/decks'),
  active: () => call<{ game: View | null }>('/api/play/games/active'),
  view: (gameId: string) => call<{ game: View }>(`/api/play/games/${encodeURIComponent(gameId)}`),
  start: (deck: { kind: 'reference'; id: string } | { kind: 'user'; deckId: string }, botLevel: BotLevel = 'normal', opponent?: Opponent) => call<{ game: View }>('/api/play/games', { method: 'POST', body: JSON.stringify({ deck, botLevel, ...(opponent ? { opponent } : {}) }) }),
  stats: () => call<{ stats: Stats }>('/api/play/stats'),
  command: (view: View, intent: Record<string, unknown>) => call<{ game: View; replayed: boolean }>(`/api/play/games/${encodeURIComponent(view.gameId)}/commands`, { method: 'POST', body: JSON.stringify({ id: newId(), expectedVersion: view.version, intent }) }),
  concede: (view: View) => call<{ game: View }>(`/api/play/games/${encodeURIComponent(view.gameId)}/concede`, { method: 'POST', body: JSON.stringify({ id: newId() }) }),
}
