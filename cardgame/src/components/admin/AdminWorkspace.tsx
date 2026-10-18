'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AdminEditor } from './AdminEditor'
import { AdminOverview } from './AdminOverview'
import { adminFetch, Facts, object, Panel, SECTIONS, text, type RecordData } from './shared'

type Props = { resource: keyof typeof SECTIONS; id?: string }
const cardEditable = ['name', 'imageUrl', 'type', 'color', 'rarity', 'cost', 'power', 'counter', 'effect', 'ability', 'trigger', 'attribute', 'family', 'notes', 'isAltArt', 'isParallel', 'isSpecial']
const pick = (data: RecordData, keys: string[]) => Object.fromEntries(keys.filter(k => k in data).map(k => [k, data[k]]))
const array = (value: unknown): RecordData[] => Array.isArray(value) ? value.map(object) : []
export function AdminWorkspace({ resource, id }: Props) {
  const params = useSearchParams(), router = useRouter(), query = params.toString()
  const [data, setData] = useState<RecordData | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(true), [revision, setRevision] = useState(0)
  const reload = useCallback(() => setRevision(v => v + 1), [])
  useEffect(() => {
    let live = true
    setBusy(true); setError(''); setData(null)
    void adminFetch(`${resource}${id ? `/${encodeURIComponent(id)}` : ''}?${query}`).then(value => { if (live) setData(value) }).catch(e => { if (live) setError(e.message) }).finally(() => { if (live) setBusy(false) })
    return () => { live = false }
  }, [resource, id, query, revision])
  function filter(form: HTMLFormElement) { const next = new URLSearchParams(); for (const [k, v] of new FormData(form)) if (String(v).trim()) next.set(k, String(v).trim()); router.push(`/admin/${resource}${id ? `/${encodeURIComponent(id)}` : ''}?${next}`) }
  const listing = ['users', 'cards', 'sets', 'openings', 'games', 'audit'].includes(resource) && !id
  return <div className="admin-workspace"><header className="admin-heading"><h1>{resource === 'overview' ? 'Administration' : SECTIONS[resource]}</h1><p className="piece-muted">{id ? 'Fiche détaillée · modifications enregistrées avec leur motif.' : resource === 'overview' ? 'Vue d’ensemble de votre application.' : 'Rechercher, consulter et gérer les données de l’application.'}</p></header>
    {id && <Link className="piece-button secondary" href={`/admin/${resource}`}>← Retour à la liste</Link>}
    {(listing || (resource === 'users' && id)) && <form className="admin-filters" key={`${resource}-${id ?? ''}-${query}`} onSubmit={e => { e.preventDefault(); filter(e.currentTarget) }}>
      <label>Recherche<input name="q" maxLength={120} defaultValue={params.get('q') ?? ''} placeholder={id ? 'Chercher une carte dans la collection' : 'Nom, numéro, email…'} /></label>
      {['cards', 'openings'].includes(resource) && <label>Extension<input name="set" defaultValue={params.get('set') ?? ''} placeholder="OP-01" /></label>}
      {resource === 'cards' && <><label>Rareté<input name="rarity" defaultValue={params.get('rarity') ?? ''} /></label><label>Type<input name="type" defaultValue={params.get('type') ?? ''} /></label><label>Variante<select name="variant" defaultValue={params.get('variant') ?? ''}><option value="">Toutes</option><option value="standard">Normale</option><option value="alt">Alternative</option><option value="parallel">Parallèle</option><option value="special">Spéciale</option></select></label></>}
      {['games', 'openings'].includes(resource) && <><label>Identifiant joueur<input name="user" defaultValue={params.get('user') ?? ''} /></label><label>Du (UTC)<input type="date" name="from" defaultValue={params.get('from') ?? ''} /></label><label>Au (UTC)<input type="date" name="to" defaultValue={params.get('to') ?? ''} /></label></>}
      {resource === 'games' && <><label>État<select name="status" defaultValue={params.get('status') ?? ''}><option value="">Tous</option><option value="ACTIVE">En cours</option><option value="FINISHED">Terminée</option></select></label><label>Difficulté<select name="level" defaultValue={params.get('level') ?? ''}><option value="">Toutes</option><option value="easy">Facile</option><option value="normal">Normal</option><option value="hard">Difficile</option></select></label></>}
      <button type="submit" className="piece-button secondary">Rechercher</button>
    </form>}
    {busy && <p role="status">Chargement…</p>}{error && <p role="alert" className="admin-error">{error}</p>}
    {error && <button type="button" className="piece-button secondary" onClick={reload}>Réessayer</button>}
    {data && <>
      {resource === 'overview' && <AdminOverview data={data} onRefresh={reload} />}
      {listing && <><p className="piece-muted">{text(data.total)} résultat(s)</p><DataTable resource={resource} rows={array(data.items)} /><Pagination data={data} params={query} path={`/admin/${resource}`} /></>}
      {resource === 'users' && id && <UserDetail id={id} data={data} reload={reload} query={query} />}
      {resource === 'cards' && id && <Panel title="Fiche du catalogue"><Facts data={object(data.card)} /><p className="piece-muted">La prise en charge et les certifications du moteur /play sont distinctes du catalogue. Les historiques de tirage sont conservés.</p><AdminEditor key={String(data.token)} resource="cards" id={id} type="CARD_EDIT" token={String(data.token)} initial={pick(object(data.card), cardEditable)} onSaved={reload} title="Corriger cette carte" /></Panel>}
      {resource === 'sets' && id && <><Panel title="Extension"><Facts data={object(data.set)} /><AdminEditor resource="sets" id={id} type="SET_EDIT" token={String(data.token)} initial={pick(object(data.set), ['name', 'description', 'imageUrl'])} onSaved={reload} title="Modifier l’extension" /></Panel><Panel title="Diagnostic du booster"><Facts data={pick(object(data.diagnostic), ['available', 'error', 'packSize', 'warnings'])} /></Panel><Panel title="Composition et règles de simulation"><Facts data={object(data.resolvedRules)} /><p>Les poids sont relatifs. Les réglages sont contrôlés sur les cartes réellement disponibles avant enregistrement.</p>{data.integrated === true && <p className="piece-muted">Composition réaliste intégrée, consultable ici. Son remplacement par un profil libre désactiverait les displays : cet éditeur préserve donc la composition et ses garanties.</p>}{data.draft === true && <p className="admin-error">La configuration actuelle est invalide. Les valeurs ci-dessous constituent un brouillon de réparation à vérifier, pas les règles actives.</p>}{Boolean(data.resolvedRules) && !data.integrated && <AdminEditor resource="sets" id={id} type="RULES_EDIT" token={String(data.rulesToken)} initial={object(data.resolvedRules)} field="rules" onSaved={reload} title="Modifier les règles du booster" />}</Panel></>}
      {resource === 'economy' && <Panel title="Paramètres actifs"><p>Révision {text(data.revision)} · dernière modification : {text(data.updatedAt)}. L’enregistrement prend effet immédiatement pour les prochaines opérations.</p><p>Modifier la bourse initiale ne recrédite pas les comptes qui l’ont déjà reçue.</p><Facts data={object(data.value)} /><AdminEditor key={String(data.token)} resource="economy" id="economy" type="ECONOMY_EDIT" token={String(data.token)} initial={object(data.value)} field="settings" onSaved={reload} title="Modifier l’économie" /></Panel>}
      {resource === 'openings' && id && <Panel title="Reçu d’ouverture"><Facts data={object(data.opening)} /></Panel>}
      {resource === 'games' && id && <><Panel title="Partie et commandes"><Facts data={object(data.game)} /></Panel><Panel title="Vue du joueur"><p>Projection filtrée : aucun état moteur brut, aucune graine ni carte cachée adverse.</p><Facts data={object(data.projection)} /></Panel></>}
      {resource === 'audit' && id && <Panel title="Modification administrative"><Facts data={data} /></Panel>}
    </>}
  </div>
}
function Pagination({ data, params, path }: { data: RecordData; params: string; path: string }) {
  const page = Number(data.page), pages = Number(data.pages)
  function url(n: number) { const q = new URLSearchParams(params); q.set('page', String(n)); return `${path}?${q}` }
  return <nav className="piece-actions admin-pagination" aria-label="Pagination">{page > 1 && <Link className="piece-button secondary" href={url(page - 1)}>Précédent</Link>}<span>Page {page} / {pages}</span>{page < pages && <Link className="piece-button secondary" href={url(page + 1)}>Suivant</Link>}</nav>
}
function DataTable({ resource, rows }: { resource: string; rows: RecordData[] }) {
  if (!rows.length) return <p className="admin-empty">Aucun résultat.</p>
  return <div className="admin-table-scroll" role="region" aria-label="Résultats" tabIndex={0}><table className="admin-table"><thead><tr><th scope="col">Élément</th><th scope="col">Informations</th><th scope="col">État / date</th><th scope="col">Action</th></tr></thead><tbody>{rows.map(row => {
    const key = String(resource === 'sets' ? row.code : row.id), user = object(row.user), booster = object(row.booster)
    return <tr key={key}><td><strong>{text(row.name ?? row.code ?? row.action ?? key)}</strong>{Boolean(row.code) && <small>{text(row.code)}</small>}</td><td>{resource === 'users' ? <>{text(row.email)} · {text(row.berries)} Berrys · niveau {text(row.accountLevel)}</> : resource === 'cards' ? <>{text(row.rarity)} · {text(row.type)} · {text(row.setCode)}{row.isAltArt ? ' · Alternative' : ''}{row.isParallel ? ' · Parallèle' : ''}{row.isSpecial ? ' · Spéciale' : ''}</> : resource === 'sets' ? <>{text(object(row._count).cards)} cartes</> : resource === 'audit' ? <>{text(row.reason)} · cible {text(row.targetId)}</> : <>{text(user.email)} · {text(booster.setCode ?? row.deckRef)}</>}</td><td>{text(row.status ?? row.botLevel)}<small>{text(row.createdAt ?? row.openedAt)}</small></td><td><Link className="piece-button secondary" href={`/admin/${resource}/${encodeURIComponent(key)}`}>Consulter</Link></td></tr>
  })}</tbody></table></div>
}
function UserDetail({ id, data, reload, query }: { id: string; data: RecordData; reload: () => void; query: string }) {
  const user = object(data.user), collection = object(data.collection)
  return <>
    <Panel title="Compte joueur"><Facts data={user} /><AdminEditor resource="users" id={id} type="USER_BERRIES" token={String(data.token)} initial={{ amount: 0 }} field="direct" onSaved={reload} title="Ajuster les Berrys" balance={Number(user.berries)} /><div className="piece-actions"><Link className="piece-button secondary" href={`/admin/openings?user=${encodeURIComponent(id)}`}>{text(data.openings)} ouvertures</Link><Link className="piece-button secondary" href={`/admin/games?user=${encodeURIComponent(id)}`}>{text(data.games)} parties</Link></div></Panel>
    <Panel title="Collection"><AddCollectionCard userId={id} onSaved={reload} /><p>{text(collection.total)} cartes différentes · recherchez une carte pour corriger sa quantité.</p>{array(collection.items).map(row => <article className="admin-owned-card" key={String(row.cardId)}><strong>{text(object(row.card).code)} · {text(object(row.card).name)}</strong><span>Quantité : {text(row.quantity)}</span><Link href={`/admin/cards/${encodeURIComponent(String(row.cardId))}`}>Fiche carte</Link><AdminEditor resource="users" id={id} type="USER_COLLECTION" token={String(row.token)} initial={{ cardId: row.cardId, quantity: row.quantity }} field="direct" onSaved={reload} title="Corriger la quantité" /></article>)}<Pagination data={collection} params={query} path={`/admin/users/${encodeURIComponent(id)}`} /></Panel>
    <Panel title="Derniers mouvements de Berrys (30)">{array(data.movements).map(row => <details key={String(row.id)}><summary>{text(row.amount)} Berrys · {text(row.reason)} · {text(row.createdAt)}</summary><Facts data={row} /></details>)}</Panel>
    <Panel title="Decks (30 derniers)">{array(data.decks).map(row => <details key={String(row.id)}><summary>{text(row.name)}</summary><Facts data={row} /></details>)}</Panel>
    <Panel title="Badges et progression"><p>La progression est calculée à partir des cartes, ouvertures et parties ; elle n’est pas remplacée par un niveau arbitraire.</p>{array(data.badges).map(row => <Facts key={String(row.badgeId)} data={row} />)}</Panel>
  </>
}

function AddCollectionCard({ userId, onSaved }: { userId: string; onSaved: () => void }) {
  const [q, setQ] = useState(''), [cards, setCards] = useState<RecordData[]>([]), [lookup, setLookup] = useState<RecordData | null>(null), [error, setError] = useState('')
  async function search() { setError(''); try { const result = await adminFetch(`cards?q=${encodeURIComponent(q)}`); setCards(array(result.items)) } catch (e) { setError(e instanceof Error ? e.message : 'Erreur réseau.') } }
  async function choose(cardId: string) { setError(''); try { const result = await adminFetch(`users/${encodeURIComponent(userId)}?card=${encodeURIComponent(cardId)}`); setLookup(object(result.lookup)); setCards([]) } catch (e) { setError(e instanceof Error ? e.message : 'Erreur réseau.') } }
  return <details><summary>Ajouter une carte ou rechercher une quantité à corriger</summary><form className="admin-filters" onSubmit={e => { e.preventDefault(); void search() }}><label>Rechercher dans le catalogue<input value={q} onChange={e => setQ(e.target.value)} maxLength={120} required minLength={2} /></label><button className="piece-button secondary" type="submit">Chercher une carte</button></form>{error && <p role="alert">{error}</p>}{cards.map(card => <button className="piece-button secondary" type="button" key={String(card.id)} onClick={() => void choose(String(card.id))}>{text(card.code)} · {text(card.name)}</button>)}{lookup && <><p>{text(object(lookup.card).code)} · {text(object(lookup.card).name)} · Quantité actuelle : {text(lookup.quantity)}</p><AdminEditor key={String(lookup.token)} resource="users" id={userId} type="USER_COLLECTION" token={String(lookup.token)} initial={{ cardId: lookup.cardId, quantity: lookup.quantity }} field="direct" title="Définir la quantité" onSaved={() => { setLookup(null); onSaved() }} /></>}</details>
}
