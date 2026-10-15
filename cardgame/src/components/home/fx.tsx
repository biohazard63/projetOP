'use client'
import Image from 'next/image'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import { useRemote } from '@/hooks/useRemote'
import { notifyBerries, useWallet } from '@/hooks/useWallet'

/** Elements marked data-reveal fade and slide in when they enter the viewport (once). */
export function useReveal() {
  useEffect(() => {
    const nodes = [...document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)')]
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { nodes.forEach(n => n.classList.add('is-in')); return }
    const observer = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); observer.unobserve(e.target) } }), { rootMargin: '0px 0px -8% 0px' })
    nodes.forEach(n => observer.observe(n)); return () => observer.disconnect()
  })
}

/** A tile that tilts in 3D towards the pointer, with a soft light following it. */
export function Tilt({ children, className, style, max = 8 }: { children: ReactNode; className?: string; style?: CSSProperties; max?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  return <div ref={ref} className={`fx-tilt${className ? ` ${className}` : ''}`} style={style}
    onPointerMove={e => { if (e.pointerType !== 'mouse') return; const el = ref.current!, b = el.getBoundingClientRect(), x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height
      el.style.setProperty('--rx', `${(0.5 - y) * max}deg`); el.style.setProperty('--ry', `${(x - 0.5) * max}deg`); el.style.setProperty('--lx', `${x * 100}%`); el.style.setProperty('--ly', `${y * 100}%`) }}
    onPointerLeave={() => { const el = ref.current!; el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg') }}>{children}</div>
}

/** Animated night-ocean backdrop: aurora glows and drifting sparks (decorative). */
export function OceanBackdrop() {
  return <div className="fx-ocean" aria-hidden="true"><i className="a1" /><i className="a2" /><i className="a3" />{Array.from({ length: 24 }, (_, i) => <b key={i} style={{ '--s': i } as CSSProperties} />)}</div>
}

type Showcase = { rares: { id: string; code: string; name: string; rarity: string; imageUrl: string }[] }
/**
 * "Treasure of the day": a face-down card to flip, a different rare card from the catalogue each day. For a signed-in
 * player (`reward`), the first flip of the Paris day also credits the daily Berries; visitors only see the teaser.
 */
export function DailyTreasure({ compact = false, reward = false }: { compact?: boolean; reward?: boolean }) {
  const showcase = useRemote<Showcase>('/api/home/showcase')
  const { wallet } = useWallet()
  const [flipped, setFlipped] = useState(false)
  const [gain, setGain] = useState<number | null>(null)
  const claimable = reward && wallet && !wallet.today.treasureClaimed
  async function flip() {
    setFlipped(f => !f)
    if (!claimable || flipped) return
    try {
      const response = await fetch('/api/berries/treasure', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const data = await response.json()
      if (response.ok && !data.replayed) setGain(data.amount)
      notifyBerries()
    } catch { /* the treasure stays claimable */ }
  }
  const rares = showcase.data?.rares ?? [], card = rares[Math.floor(Date.now() / 86_400_000) % Math.max(1, rares.length)]
  return <div className={`fx-treasure${compact ? ' compact' : ''}`}>
    <button type="button" className={`fx-treasure-card${flipped ? ' flipped' : ''}`} onClick={() => void flip()} disabled={!card} aria-label={flipped && card ? `Trésor du jour : ${card.name}` : 'Retourner le trésor du jour'}>
      <span className="fx-treasure-inner">
        <span className="fx-treasure-back"><Image src="/images/card-back.jpg" alt="" fill sizes="220px" /><em><Sparkles size={16} /> Touchez</em></span>
        <span className="fx-treasure-front">{card && <Image src={card.imageUrl} alt={card.name} fill sizes="220px" />}<span className="fx-sheen" /></span>
      </span>
    </button>
    {gain !== null && <span className="fx-treasure-gain" aria-live="polite">+{gain.toLocaleString('fr-FR')} ฿</span>}
    <div className="fx-treasure-text"><p className="fx-kicker">Trésor du jour</p>{flipped && card ? <><h3>{card.name}</h3><p>{card.code} · {card.rarity}</p>{reward && wallet && <p className="fx-treasure-note">{gain !== null ? `+${gain.toLocaleString('fr-FR')} ฿ ajoutés à votre bourse !` : wallet.today.treasureClaimed ? 'Berrys du jour récupérés · revenez demain' : ''}</p>}</>
      : <><h3>Une carte rare vous attend</h3><p>{claimable ? `Retournez-la pour gagner ${wallet.economy.rewards.dailyTreasure.toLocaleString('fr-FR')} ฿ !` : reward && wallet ? 'Berrys du jour déjà récupérés · revenez demain' : 'Retournez-la : elle change chaque jour.'}</p></>}</div>
  </div>
}
