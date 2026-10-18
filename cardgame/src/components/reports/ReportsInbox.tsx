'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { REPORT_CATEGORIES, REPORT_STATUSES, type ReportCard, type ReportContext, type ReportInput, type ReportFilters } from '@/lib/reports/service'
import { CardSnapshot } from './CardSnapshot'

type Row = { id: string; source: ReportInput['source']; category: keyof typeof REPORT_CATEGORIES; description: string; status: keyof typeof REPORT_STATUSES; cardSnapshot: ReportCard | null; context: ReportContext; createdAt: string; user: { name: string | null; email: string } }
type Summary = { total: number; counts: Partial<Record<keyof typeof REPORT_STATUSES, number>> }
export function ReportsInbox() {
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [busy, setBusy] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')
  const generation = useRef(0)
  const filters = { ...(status ? { status } : {}), ...(source ? { source } : {}), ...(category ? { category } : {}), ...(search ? { q: search } : {}) } as ReportFilters
  async function load(filter: ReportFilters, next?: string) {
    const current = ++generation.current
    setBusy(true); setError('')
    try {
      const params = new URLSearchParams({ ...filter, ...(next ? { cursor: next } : {}) })
      const response = await fetch(`/api/reports?${params}`, { cache: 'no-store' })
      if (!response.ok) throw Error('Chargement des signalements indisponible. Réessayez avec « Actualiser ».')
      const data = await response.json()
      if (current !== generation.current) return
      setRows(old => next ? [...old, ...data.reports] : data.reports); setCursor(data.nextCursor)
      setSummary({ total: data.total, counts: data.counts })
    } catch (e) { if (current === generation.current) setError(e instanceof Error ? e.message : 'Erreur réseau.') }
    finally { if (current === generation.current) setBusy(false) }
  }
  useEffect(() => {
    setRows([]); setCursor(null); setSummary(null)
    void load({ ...(status ? { status: status as ReportFilters['status'] } : {}), ...(source ? { source: source as ReportFilters['source'] } : {}), ...(category ? { category: category as ReportFilters['category'] } : {}), ...(search ? { q: search } : {}) })
  }, [status, source, category, search])
  async function update(id: string, next: string) {
    setSaving(id); setError('')
    try {
      const response = await fetch('/api/reports', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: next }) })
      if (!response.ok) throw Error('Le changement de statut n’a pas été enregistré.')
      await load(filters)
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur réseau.') }
    finally { setSaving(null) }
  }
  return <section aria-label="Tableau de bord des signalements">
    <div className="admin-metrics" aria-label="Compteurs des signalements">
      {([['', 'Tous les signalements'], ...Object.entries(REPORT_STATUSES)]).map(([value, label]) => <button key={value} className="admin-metric" type="button" aria-pressed={status === value} disabled={Boolean(saving)} onClick={() => setStatus(value)}><span>{label}</span><strong>{summary ? value ? summary.counts[value as keyof typeof REPORT_STATUSES] ?? 0 : summary.total : '—'}</strong></button>)}
    </div>
    <p className="piece-muted admin-count-note">Les compteurs portent sur l’origine, le type et la recherche sélectionnés.</p>
    <div className="admin-filters">
      <div className="admin-filter"><label htmlFor="admin-source">Origine</label><select id="admin-source" value={source} disabled={Boolean(saving)} onChange={e => setSource(e.target.value)}><option value="">Toutes</option><option value="PLAY">Partie /play</option><option value="BOOSTER">Boosters</option><option value="COLLECTION">Collection</option></select></div>
      <div className="admin-filter"><label htmlFor="admin-category">Type de problème</label><select id="admin-category" value={category} disabled={Boolean(saving)} onChange={e => setCategory(e.target.value)}><option value="">Tous</option>{Object.entries(REPORT_CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <form role="search" aria-label="Rechercher un signalement" onSubmit={e => { e.preventDefault(); if (query.trim() === search) void load(filters); else setSearch(query.trim()) }}><label htmlFor="report-search">Carte, joueur ou description</label><div><input id="report-search" value={query} maxLength={120} disabled={Boolean(saving)} onChange={e => setQuery(e.target.value)} placeholder="ST01-001, nom de carte…" /><button type="submit" className="piece-button secondary" disabled={Boolean(saving)}>Rechercher</button></div></form>
      <button className="piece-button secondary" disabled={busy || Boolean(saving)} onClick={() => void load(filters)}>Actualiser</button>
    </div>
    {error && <p role="alert" className="admin-error">{error}</p>}{busy && <p role="status">Chargement…</p>}
    {!busy && !error && !rows.length && <div className="admin-empty"><h2>Aucun signalement</h2><p>Les signalements correspondant aux filtres apparaîtront ici.</p></div>}
    {rows.length > 0 && <div className="admin-table-scroll" role="region" aria-label="Liste des signalements" tabIndex={0}><table className="admin-table">
      <caption className="sr-only">Signalements des joueurs et état de leur traitement</caption>
      <thead><tr><th scope="col">Date / joueur</th><th scope="col">Carte</th><th scope="col">Origine / problème</th><th scope="col">Statut</th><th scope="col">Détails</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.id}>
        <td><time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleString('fr-FR')}</time><strong>{row.user.name || row.user.email}</strong><small>{row.user.email}</small></td>
        <td>{row.cardSnapshot ? <><strong>{row.cardSnapshot.code}</strong><span>{row.cardSnapshot.name}</span><small>{row.cardSnapshot.rarity || row.cardSnapshot.type}</small></> : <span>Bug général</span>}</td>
        <td><span className="admin-source">{row.source === 'PLAY' ? 'Partie /play' : row.source === 'COLLECTION' ? 'Collection' : 'Boosters'}</span><span>{REPORT_CATEGORIES[row.category]}</span></td>
        <td><label className="sr-only" htmlFor={`status-${row.id}`}>Statut du signalement {row.id}</label><select id={`status-${row.id}`} value={row.status} disabled={Boolean(saving)} onChange={e => void update(row.id, e.target.value)}>{Object.entries(REPORT_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{saving === row.id && <small role="status">Enregistrement…</small>}</td>
        <td><details><summary>Consulter le signalement</summary><div className="admin-report-detail"><p className="whitespace-pre-wrap">{row.description}</p>{row.cardSnapshot && <CardSnapshot card={row.cardSnapshot} />}<details><summary>Contexte du signalement</summary><pre>{JSON.stringify(row.context, null, 2)}</pre></details><div className="piece-actions">{row.cardSnapshot && <Link href={`/admin/cards?q=${encodeURIComponent(row.cardSnapshot.code)}`}>Rechercher cette carte</Link>}{row.context.openingId && <Link href={`/admin/openings/${encodeURIComponent(row.context.openingId)}`}>Voir l’ouverture</Link>}{row.context.gameId && <Link href={`/admin/games/${encodeURIComponent(row.context.gameId)}`}>Voir la partie</Link>}</div><small>Référence : {row.id}</small><p className="piece-muted">Informations affichées au joueur. Vérifier la carte avant toute correction.</p></div></details></td>
      </tr>)}</tbody>
    </table></div>}
    {cursor && <button className="piece-button secondary mt-5" disabled={busy || Boolean(saving)} onClick={() => void load(filters, cursor)}>Signalements précédents</button>}
  </section>
}
