'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Coins } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { notifyBerries } from '@/hooks/useWallet'
import { formatBerries } from './Berries'

type Item = { cardId: string; name: string; code: string; imageUrl: string | null; tier: string; extra: number; keep: number; unit: number; total: number }
type Preview = { items: Item[]; total: number; copies: number; keepCopies: number }
// A gateway error (504) answers with an HTML page, not JSON: show a readable message instead of a parse error.
const readJson = async (r: Response) => r.json().catch(() => ({ error: r.status === 504 ? 'Le serveur a mis trop de temps à répondre, réessayez.' : 'Réponse du serveur illisible, réessayez.' }))
const TIER: Record<string, string> = { ALT: 'Alternative', 'SP CARD': 'SP', TR: 'Treasure Rare', MANGA: 'Manga', 'MANGA RED': 'Manga red' }

/** Sells every copy above what the player keeps (4, or more when a deck uses more), after showing the exact list. */
export default function ResaleDialog({ open, onOpenChange, onSold }: { open: boolean; onOpenChange: (open: boolean) => void; onSold: () => void }) {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [key, setKey] = useState('')
  useEffect(() => {
    if (!open) return
    setPreview(null); setMessage(''); setKey(crypto.randomUUID())
    void fetch('/api/berries/resale', { cache: 'no-store' }).then(async r => { const data = await readJson(r); if (r.ok) setPreview(data); else setMessage(data.error ?? 'Revente indisponible') }).catch(() => setMessage('Revente indisponible'))
  }, [open])
  async function sell() {
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/berries/resale', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idempotencyKey: key }) })
      const data = await readJson(response)
      if (!response.ok) throw new Error(data.error ?? 'Revente impossible')
      setMessage(`+${formatBerries(data.amount)} · ${data.copies} copies revendues`); setPreview(p => p && { ...p, items: [], total: 0, copies: 0 })
      notifyBerries(); onSold()
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Revente impossible') } finally { setBusy(false) }
  }
  return <Dialog open={open} onOpenChange={value => { if (!busy) onOpenChange(value) }}>
    <DialogContent className="piece-modal rs-modal">
      <DialogTitle>Revendre mes doublons</DialogTitle>
      <DialogDescription>Vous gardez toujours {preview?.keepCopies ?? 4} exemplaires de chaque carte, et davantage si l’un de vos decks en utilise plus.</DialogDescription>
      {!preview && !message && <p role="status" className="rs-muted">Calcul de vos doublons…</p>}
      {preview && preview.items.length > 0 && <>
        <ul className="rs-list">{preview.items.map(i => <li key={i.cardId}>
          <span className="rs-thumb">{i.imageUrl && <Image src={i.imageUrl} alt="" width={44} height={62} />}</span>
          <span className="rs-name"><b>{i.name}</b><small>{i.code} · {TIER[i.tier] ?? i.tier} · garde {i.keep}</small></span>
          <span className="rs-calc">{i.extra} × {formatBerries(i.unit)}</span><b className="rs-total">{formatBerries(i.total)}</b>
        </li>)}</ul>
        <button type="button" className="piece-button rs-sell" disabled={busy} onClick={() => void sell()}><Coins size={18} />{busy ? 'Revente…' : `Vendre ${preview.copies} copies pour ${formatBerries(preview.total)}`}</button>
      </>}
      {preview && !preview.items.length && !message && <p className="rs-muted">Aucun doublon en trop pour l’instant.</p>}
      {message && <p role="status" className="rs-message">{message}</p>}
    </DialogContent>
  </Dialog>
}
