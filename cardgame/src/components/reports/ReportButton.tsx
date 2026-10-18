'use client'
import { useId, useRef, useState } from 'react'
import { REPORT_CATEGORIES, type ReportCard, type ReportContext, type ReportInput } from '@/lib/reports/service'
import { CardSnapshot } from './CardSnapshot'

export function ReportButton({ source, card, context }: { source: ReportInput['source']; card?: ReportCard; context: ReportContext }) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<ReportInput['category']>(card ? 'WRONG_DATA' : 'BUG')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState<string | null>(null)
  const requestId = useRef<string | null>(null)
  const id = useId()
  const formId = `${id}-report`
  function expand(alternative = false) {
    setOpen(true)
    if (alternative) { setCategory('WRONG_VARIANT'); setDescription('Cette carte est annoncée comme une alternative, mais son illustration semble être la version normale.') }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    requestId.current ??= crypto.randomUUID()
    try {
      const response = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: requestId.current, source, category, description, card, context }) })
      const data = await response.json()
      if (!response.ok) throw Error(response.status === 401 ? 'Reconnectez-vous pour envoyer votre signalement.' : response.status === 429 ? 'Trop de signalements. Réessayez dans quelques minutes.' : response.status === 400 ? 'Vérifiez la description et les informations de la carte.' : 'Envoi indisponible pour le moment. Votre description est conservée, réessayez.')
      if (typeof data.id !== 'string') throw Error('Confirmation absente. Réessayez.')
      setSent(data.id)
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur réseau. Réessayez.') }
    finally { setBusy(false) }
  }
  return <div className="report-widget">
    {!open ? <div className="report-triggers"><button type="button" className="piece-button secondary" aria-expanded={false} aria-controls={formId} onClick={() => expand()}>Signaler un problème</button>{card && (card.isAltArt || card.drawVariant === 'alt' || card.drawTier === 'ALT') && <button type="button" className="piece-button secondary" onClick={() => expand(true)}>Cette carte n’est pas une alternative</button>}</div> :
      <section id={formId} className="report-form" aria-label="Signaler un problème">
        <h3>Signaler un problème</h3>
        {sent ? <p role="status">Merci, votre signalement a été enregistré. Référence : {sent}</p> : <>
          {card && <details><summary>Informations de la carte jointes · {card.code} · {card.name}</summary><CardSnapshot card={card} /></details>}
          <p className="piece-muted">{context.gameId ? `Partie jointe · tour ${context.turn ?? '—'}.` : context.openingId ? 'L’ouverture concernée sera jointe.' : 'Le contexte de cet écran sera joint.'}</p>
          <form onSubmit={submit}>
            <label htmlFor={`${id}-category`}>Type de problème</label>
            <select id={`${id}-category`} value={category} disabled={busy} onChange={e => setCategory(e.target.value as ReportInput['category'])}>{Object.entries(REPORT_CATEGORIES).filter(([value]) => card || value === 'BUG').map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <label htmlFor={`${id}-description`}>Ce qui ne va pas et ce que vous attendiez</label>
            <textarea id={`${id}-description`} required minLength={5} maxLength={4000} rows={4} value={description} disabled={busy} onChange={e => setDescription(e.target.value)} />
            {error && <p role="alert">{error}</p>}
            <div className="piece-actions"><button type="submit" className="piece-button" disabled={busy || description.trim().length < 5}>{busy ? 'Envoi…' : 'Envoyer le signalement'}</button><button type="button" className="piece-button secondary" disabled={busy} onClick={() => setOpen(false)}>Annuler</button></div>
          </form>
        </>}
      </section>}
  </div>
}
