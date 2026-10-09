import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Compass } from 'lucide-react'
export function PageHeading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description?: string; children?: ReactNode }) {
  return <div className="piece-heading"><div><p className="piece-eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="piece-muted">{description}</p>}</div>{children && <div className="piece-actions">{children}</div>}</div>
}
export function SectionHeading({ title, href, label = 'Tout voir' }: { title: string; href?: string; label?: string }) {
  return <div className="piece-section-heading"><h2>{title}</h2>{href && <Link href={href}>{label}<ArrowUpRight size={15} /></Link>}</div>
}
export function Progress({ value, label }: { value: number; label: string }) {
  return <div className="piece-progress" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>
}
export function EmptyState({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className="piece-empty"><Compass size={34} aria-hidden="true" /><h2>{title}</h2><p>{description}</p>{children}</div>
}
export function LoadState({ loading, error, retry }: { loading: boolean; error?: string; retry?: () => void }) {
  if (error) return <div className="piece-error" role="alert"><p>{error}</p>{retry && <button className="piece-button secondary" onClick={retry}>Réessayer</button>}</div>
  return loading ? <div className="piece-skeleton-grid" role="status" aria-label="Chargement"><span className="sr-only">Chargement…</span>{Array.from({ length: 6 }, (_, i) => <div key={i} className="piece-skeleton" />)}</div> : null
}
