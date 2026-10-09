import Link from 'next/link'
import { ArrowUpRight, PackageOpen } from 'lucide-react'
import BoosterArtwork from '@/components/booster-opening/BoosterArtwork'
import type { BoosterCatalogItem } from '@/lib/boosters/types'
import type { SetProgress } from '@/lib/collector/types'
import { Progress } from './Primitives'
export default function SetTile({ set, progress, authenticated }: { set: BoosterCatalogItem; progress?: SetProgress; authenticated: boolean }) {
  return <article className="piece-set"><span className="piece-set-code">{set.code}</span><Link href={`/boosters/${encodeURIComponent(set.code)}`} aria-label={`Découvrir ${set.name}`}><div className="piece-set-stage"><BoosterArtwork src={set.imageUrl} alt={`Booster ${set.name}`} /></div></Link>
    <div className="piece-set-content"><h3>{set.name}</h3><div className="piece-set-meta"><span>{progress ? `${progress.unique} / ${set.cardCount} cartes` : `${set.cardCount} cartes`}</span>{progress && <span>{progress.percentage}%</span>}</div>{progress ? <Progress value={progress.percentage} label={`Collection ${set.code}`} /> : <p className="text-[10px] text-slate-400">Connectez-vous pour suivre votre progression.</p>}
    <div className="piece-set-actions"><Link href={`/boosters/${encodeURIComponent(set.code)}`} className="piece-button secondary">Détails <ArrowUpRight size={13} /></Link>{set.available ? <Link href={authenticated ? `/booster-opening?set=${encodeURIComponent(set.code)}` : '/login'} className="piece-button"><PackageOpen size={13} />Ouvrir</Link> : <button className="piece-button" disabled title={set.error || 'Extension indisponible'}>Indisponible</button>}</div></div>
  </article>
}
