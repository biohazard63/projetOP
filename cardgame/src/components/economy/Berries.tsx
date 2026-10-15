'use client'
import Link from 'next/link'
import { Coins } from 'lucide-react'
import { useWallet } from '@/hooks/useWallet'

export const formatBerries = (n: number) => `${n.toLocaleString('fr-FR')} ฿`

/** Balance chip of the top bar; links to the wallet on the profile. */
export function BerryChip() {
  const { wallet } = useWallet()
  if (!wallet) return null
  return <Link href="/profile#berries" className="piece-berries" aria-label={`Solde : ${formatBerries(wallet.balance)}`} title={wallet.economy.events.length ? wallet.economy.events.map(e => e.label).join(' · ') : 'Vos Berrys'}>
    <Coins size={15} /><b>{wallet.balance.toLocaleString('fr-FR')}</b><span>฿</span>{wallet.economy.events.length > 0 && <i className="piece-berries-event" aria-hidden="true" />}
  </Link>
}
