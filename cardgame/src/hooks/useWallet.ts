'use client'
import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import type { Economy } from '@/lib/economy/config'

export type Wallet = { balance: number; economy: Economy; today: { treasureClaimed: boolean; gamesEarned: number; gamesCap: number }; recent: { id: string; amount: number; reason: string; balanceAfter: number; createdAt: string; details: unknown }[] }
const EVENT = 'berries:changed'
/** Tell every wallet on the page (navbar, booster page…) to refresh after a credit or a purchase. */
export const notifyBerries = () => { window.dispatchEvent(new Event(EVENT)); window.dispatchEvent(new Event('progress:sync')) }

/** The player's Berry wallet (null when signed out or not loaded yet). */
export function useWallet() {
  const { status } = useSession()
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const load = useCallback(async () => {
    try { const response = await fetch('/api/berries', { cache: 'no-store' }); if (response.ok) setWallet(await response.json()) } catch { /* the balance stays as it was */ }
  }, [])
  useEffect(() => {
    if (status !== 'authenticated') { setWallet(null); return }
    void load()
    window.addEventListener(EVENT, load)
    return () => window.removeEventListener(EVENT, load)
  }, [status, load])
  return { wallet, reload: load }
}
