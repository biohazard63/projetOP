'use client'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { HelpCircle, X } from 'lucide-react'
import Image from 'next/image'
import PackArt from './PackArt'

/**
 * The hero visual follows the chosen quantity: one floating pack, a fan of 5 or 10 packs dealt in, or the series'
 * 24-pack display dropping into place (a box drawn from the pack artwork: Bandai provides no display image per set).
 */
export default function HeroPacks({ src, alt, count, code, title }: { src?: string | null; alt: string; count: 1 | 5 | 10 | 24; code?: string; title?: string }) {
  if (count === 24) return <div key={`display-${code}`} className="bo-display" aria-label={`Display de 24 boosters ${code ?? ''}`} role="img">
    <div className="bo-box">
      <div className="bo-box-back" aria-hidden="true" />
      <div className="bo-box-packs" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <div key={i} className="bo-box-pack" style={{ '--i': i } as CSSProperties}><PackArt src={src} alt="" /></div>)}</div>
      <div className="bo-box-front">
        {src && <Image src={src} alt="" fill sizes="320px" className="bo-box-art" />}
        <div className="bo-box-label"><span>ONE PIECE CARD GAME</span><b>{title ?? code}</b><small>{code} · BOOSTER DISPLAY · 24 PACKS</small></div>
      </div>
      <div className="bo-box-side" aria-hidden="true" />
    </div>
    <span className="bo-box-shadow" aria-hidden="true" />
  </div>
  if (count > 1) return <div key={`fan-${count}-${code}`} className="bo-hero-fan" style={{ '--n': count } as CSSProperties}>
    {Array.from({ length: count }, (_, i) => {
      const offset = i - (count - 1) / 2
      return <div key={i} className="bo-fan-pack" style={{ '--i': i, '--a': `${offset * (count > 5 ? 3.5 : 6)}deg`, '--y': `${offset * offset * (count > 5 ? 1.2 : 3)}px` } as CSSProperties}>
        <PackArt src={src} alt={i === Math.floor(count / 2) ? alt : ''} testId={i === Math.floor(count / 2) ? 'booster-artwork' : undefined} eager />
      </div>
    })}
    <span className="bo-fan-count">×{count}</span>
  </div>
  return <div key={`single-${code}`} className="bo-hero-pack"><PackArt testId="booster-artwork" src={src} alt={alt} eager /></div>
}

/**
 * The player's open box of this product, as a stat tile: a ring of the box (opened part, the packs about to be opened
 * in gold) with the packs left in the middle. Only counts are shown, never where the guaranteed hits are.
 */
export function DisplayStat({ opened, size, take, started }: { opened: number; size: number; take: number; started: boolean }) {
  const left = size - opened, next = Math.min(take, left)
  const style = { '--done': `${opened / size * 100}%`, '--next': `${(opened + next) / size * 100}%` } as CSSProperties
  const [help, setHelp] = useState(false), box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!help) return
    const close = (e: Event) => { if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setHelp(false) }
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', close)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close) }
  }, [help])
  return <div ref={box} className="bo-stat-display" title={take > left ? `×${take} : les ${left} derniers, puis ${take - left} d’une nouvelle display` : undefined}
    aria-label={started ? `Display en cours : ${left} boosters restants sur ${size}` : `Nouvelle display de ${size} boosters`}>
    <span className="bo-ring" style={style} aria-hidden="true"><b>{left}</b></span>
    <span className="bo-stat-text">{started ? `Restants · display ${opened}/${size}` : 'Nouvelle display'}{take > left && <em>puis {take - left} d’une nouvelle</em>}</span>
    <button type="button" className="bo-help" aria-label="Comment fonctionne la display ?" aria-expanded={help} onClick={() => setHelp(h => !h)}><HelpCircle size={16} /></button>
    {help && <div className="bo-help-pop" role="dialog" aria-label="La display virtuelle">
      <button type="button" className="bo-help-close" aria-label="Fermer" onClick={() => setHelp(false)}><X size={14} /></button>
      <b>Comme une vraie boîte de {size} boosters</b>
      <p>Vos boosters de cette extension sortent tous de votre display en cours, dans l’ordre, même achetés un par un.</p>
      <ul><li>Chaque display contient <strong>2 alternatives</strong>, <strong>7 SR</strong> et <strong>8 Leaders</strong> garantis ; SEC, SP, Treasure Rare et Manga y sont tirés au sort.</li>
        <li>Vous ne savez pas dans quels boosters ils se cachent : peut-être le prochain, peut-être le dernier.</li>
        <li>Quand la display est vide, une nouvelle commence.</li>
        <li>L’option « Display » ouvre une boîte neuve d’un coup, moins chère que {size} boosters, sans toucher à celle en cours.</li></ul>
    </div>}
  </div>
}
