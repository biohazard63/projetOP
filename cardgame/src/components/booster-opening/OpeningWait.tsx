'use client'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

// Messages by elapsed time: the player always knows the opening is under way, and that waiting longer is safe.
const STEPS = [
  { at: 0, text: (n: string) => `Ouverture ${n}…` },
  { at: 1500, text: () => 'Tirage des cartes…' },
  { at: 4500, text: () => 'Ajout à votre collection…' },
  { at: 9000, text: () => 'Le serveur prend son temps, restez sur la page : rien ne sera payé deux fois.' },
]

/** Shown over the hero packs while the server credits the opening (before the tear scene). */
export default function OpeningWait({ count }: { count: number }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => { const start = Date.now(), t = setInterval(() => setElapsed(Date.now() - start), 250); return () => clearInterval(t) }, [])
  const label = count === 24 ? 'de la display' : count > 1 ? `de ${count} boosters` : 'du booster'
  const step = [...STEPS].reverse().find(s => elapsed >= s.at)!
  return <div className="bo-wait" role="status" aria-live="polite">
    <Loader2 className="bo-wait-spin" size={22} aria-hidden="true" />
    <span>{step.text(label)}</span>
    <i className="bo-wait-bar" aria-hidden="true" />
  </div>
}
