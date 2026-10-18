'use client'
import { useId, useRef, useState } from 'react'
import { adminFetch, labels, object, Facts, type RecordData } from './shared'

const options: Record<string, string[]> = { type: ['LEADER', 'CHARACTER', 'EVENT', 'STAGE', 'DON'], variant: ['any', 'standard', 'alt', 'parallel', 'special'], selection: ['card', 'number'], variantPolicy: ['legacy', 'metadata'] }
function Fields({ value, onChange, name = '' }: { value: unknown; onChange: (next: unknown) => void; name?: string }) {
  const id = useId()
  const templates: Record<string, unknown> = { events: { id: crypto.randomUUID(), label: 'Nouvel événement', start: new Date().toISOString(), end: new Date(Date.now() + 86400000).toISOString(), rewardMultiplier: 1, priceMultiplier: 1, resaleMultiplier: 1 }, slots: { label: 'Nouvelle carte', choices: [{ rarity: 'C', weight: 1, variant: 'standard' }] }, choices: { rarity: 'C', weight: 1, variant: 'standard' } }
  if (Array.isArray(value)) return <div className="admin-field-group">{value.map((v, i) => <fieldset key={i}><legend>{labels[name] ?? name} {i + 1}</legend><Fields value={v} name={name === 'events' ? 'event' : name} onChange={next => onChange(value.map((old, n) => n === i ? next : old))} />{name in templates && <button className="piece-button secondary" type="button" onClick={() => onChange(value.filter((_, n) => n !== i))}>Retirer cet élément</button>}</fieldset>)}{name in templates && <button className="piece-button secondary" type="button" onClick={() => onChange([...value, templates[name]])}>Ajouter un élément</button>}</div>
  if (value !== null && typeof value === 'object') return <div className="admin-field-group">{Object.entries(object(value)).filter(([k]) => !k.startsWith('_')).map(([key, v]) => <Fields key={key} name={key} value={v} onChange={next => onChange({ ...object(value), [key]: next })} />)}</div>
  const title = labels[name] ?? name
  if (typeof value === 'boolean') return <label className="admin-checkbox"><input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} />{title}</label>
  if (options[name] && value !== null) return <label htmlFor={id}>{title}<select id={id} value={String(value)} onChange={e => onChange(e.target.value)}>{options[name].map(o => <option key={o} value={o}>{o}</option>)}</select></label>
  const numeric = typeof value === 'number' || ['cost', 'power', 'quantity', 'amount'].includes(name)
  const multiline = ['effect', 'ability', 'trigger', 'notes', 'description'].includes(name)
  return <label htmlFor={id}>{title}{multiline ? <textarea id={id} rows={3} value={value === null ? '' : String(value)} onChange={e => onChange(e.target.value || null)} /> : <input id={id} readOnly={name === 'cardId'} type={numeric ? 'number' : 'text'} step="any" value={value === null ? '' : String(value)} onChange={e => onChange(numeric ? e.target.value === '' ? null : Number(e.target.value) : e.target.value)} />}</label>
}
export function AdminEditor({ resource, id, type, token, initial, field = 'changes', onSaved, title = 'Modifier', balance }: { resource: string; id: string; type: string; token: string; initial: RecordData; field?: 'changes' | 'settings' | 'rules' | 'direct'; onSaved: () => void; title?: string; balance?: number }) {
  const [open, setOpen] = useState(false), [draft, setDraft] = useState(initial), [reason, setReason] = useState(''), [preview, setPreview] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const request = useRef<string | null>(null)
  async function save() {
    setBusy(true); setError(''); request.current ??= crypto.randomUUID()
    try { await adminFetch(`${resource}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ type, id, requestId: request.current, expected: token, reason, ...(field === 'direct' ? draft : { [field]: draft }) }) }); setOpen(false); onSaved() }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur réseau.') }
    finally { setBusy(false) }
  }
  if (!open) return <button type="button" className="piece-button secondary" onClick={() => { setDraft(initial); setReason(''); setPreview(false); setError(''); request.current = null; setOpen(true) }}>{title}</button>
  return <section className="admin-editor" aria-label={title}><h3>{title}</h3>{error && <p role="alert" className="admin-error">{error}</p>}{preview ? <><div className="admin-comparison"><div><h4>Avant</h4><Facts data={initial} /></div><div><h4>Après</h4><Facts data={draft} /></div></div><p>Motif : {reason}</p>{balance !== undefined && <p>Solde : {balance.toLocaleString('fr-FR')} → {(balance + Number(draft.amount)).toLocaleString('fr-FR')} Berrys</p>}<p>Cette modification sera enregistrée dans l’historique d’administration.</p><div className="piece-actions"><button type="button" className="piece-button" disabled={busy} onClick={() => void save()}>{busy ? 'Enregistrement…' : 'Confirmer la modification'}</button><button type="button" className="piece-button secondary" disabled={busy} onClick={() => { setPreview(false); request.current = null }}>Revenir au formulaire</button></div></> : <form onSubmit={e => { e.preventDefault(); setPreview(true) }}><Fields value={draft} onChange={v => setDraft(object(v))} /><label>Motif de la modification<textarea required minLength={5} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label><div className="piece-actions"><button className="piece-button" type="submit" disabled={reason.trim().length < 5}>Vérifier avant d’enregistrer</button><button type="button" className="piece-button secondary" onClick={() => setOpen(false)}>Annuler</button></div></form>}</section>
}
