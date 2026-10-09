import { useCallback } from 'react'
import type { OpeningResult } from '@/lib/boosters/types'

// The client supplies an operation key, never card IDs or draw probabilities.
export function useBooster() {
  const openBooster = useCallback(async (setCode: string, idempotencyKey: string): Promise<{ opening: OpeningResult; replayed: boolean }> => {
    const response = await fetch('/api/booster/open', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ setCode, idempotencyKey }) })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Ouverture non confirmée ; réessayez avec la même clé.')
    return data
  }, [])
  return { openBooster }
}
