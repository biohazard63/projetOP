'use client'
import { useEffect, useId, useRef, useState } from 'react'
import type { View } from './api'

/** Only the currently projected battle is used, never an inferred historical target. */
export function BattleArrow({ battle }: { battle: View['projection']['battle'] }) {
  const root = useRef<SVGSVGElement>(null), marker = useId().replaceAll(':', '')
  const [line, setLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const attacker = battle?.attacker, target = battle?.target
  useEffect(() => {
    const surface = root.current?.parentElement
    if (!surface || !attacker || !target) { setLine(null); return }
    const update = () => {
      const from = surface.querySelector(`.play-slot[data-card="${CSS.escape(attacker)}"]`), to = surface.querySelector(`.play-slot[data-card="${CSS.escape(target)}"]`)
      if (!from || !to) { setLine(null); return }
      const box = surface.getBoundingClientRect(), a = from.getBoundingClientRect(), b = to.getBoundingClientRect()
      setLine({ x1: a.left + a.width / 2 - box.left, y1: a.top + a.height / 2 - box.top, x2: b.left + b.width / 2 - box.left, y2: b.top + b.height / 2 - box.top })
    }
    update()
    const observer = new ResizeObserver(update); observer.observe(surface)
    window.addEventListener('resize', update)
    return () => { observer.disconnect(); window.removeEventListener('resize', update) }
  }, [attacker, target])
  return <svg ref={root} className="tbl-battle-arrow" aria-hidden><defs><marker id={marker} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="currentColor" /></marker></defs>{line && <line {...line} markerEnd={`url(#${marker})`} />}</svg>
}
