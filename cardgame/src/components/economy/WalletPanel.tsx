'use client'
import Link from 'next/link'
import { Coins, Gift, PackageOpen, Swords, Repeat2 } from 'lucide-react'
import { useWallet } from '@/hooks/useWallet'
import { formatBerries } from './Berries'

const REASON: Record<string, string> = { STARTER_GRANT: 'Bourse de départ', DAILY_TREASURE: 'Trésor du jour', BOT_GAME: 'Partie contre le bot', DUPLICATE_SALE: 'Revente de doublons', BOOSTER_PURCHASE: 'Booster', DISPLAY_PURCHASE: 'Display' }

/** Profile wallet: balance, today's earnings and the last movements of the ledger. */
export default function WalletPanel() {
  const { wallet } = useWallet()
  if (!wallet) return null
  const { today, economy } = wallet
  return <section id="berries" className="pf-section pf-wallet" data-reveal>
    <h2><Coins size={20} /> Ma bourse</h2>
    <div className="pf-wallet-grid">
      <div className="pf-wallet-balance"><span>Solde</span><strong>{formatBerries(wallet.balance)}</strong>
        {economy.events.map(e => <em key={e.id}>{e.label} jusqu’au {new Date(e.end).toLocaleDateString('fr-FR')}</em>)}</div>
      <ul className="pf-wallet-ways">
        <li><Gift size={16} />Trésor du jour : {today.treasureClaimed ? 'récupéré ✓' : <Link href="/home">{formatBerries(economy.rewards.dailyTreasure)} à récupérer</Link>}</li>
        <li><Swords size={16} />Parties aujourd’hui : {formatBerries(today.gamesEarned)} / {formatBerries(today.gamesCap)}</li>
        <li><Repeat2 size={16} /><Link href="/collection?resale=1">Revendre mes doublons</Link></li>
        <li><PackageOpen size={16} />Booster : {formatBerries(economy.prices.booster)}</li>
      </ul>
    </div>
    {wallet.recent.length > 0 && <ol className="pf-wallet-log">{wallet.recent.slice(0, 8).map(t => <li key={t.id}>
      <span>{REASON[t.reason] ?? t.reason}</span><time>{new Date(t.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
      <b className={t.amount >= 0 ? 'in' : 'out'}>{t.amount >= 0 ? '+' : '−'}{formatBerries(Math.abs(t.amount))}</b></li>)}</ol>}
  </section>
}
