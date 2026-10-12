'use client'
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

// M5-3 — one pointer model for touch and mouse. A press is a TAP (quick, no movement), a LONG PRESS (held
// still 450 ms: inspect) or a DRAG. In the hand, a drag starts only when the finger moves clearly upwards, so a
// horizontal swipe keeps scrolling the hand natively (touch-action: pan-x). A drop sends nothing unless it lands
// on a drop target the legal actions allow; anything else cancels. Nothing here talks to the server.
export type DragSource = { kind: 'hand' | 'don' | 'attacker'; id: string; printingKey: string | null; fixed?: boolean }
export type DragState = DragSource & { x: number; y: number; over: string | null }
const LONG_PRESS = 450, SLOP = 8

export function useGestures(handlers: { tap: (id: string) => void; inspect: (id: string) => void; drop: (source: DragSource, targetId: string) => void; accepts: (source: DragSource, targetId: string) => boolean }) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const press = useRef<{ source: DragSource; x: number; y: number; pointerId: number; timer: ReturnType<typeof setTimeout> | null; long: boolean; dragging: boolean; el: HTMLElement } | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const set = (d: DragState | null) => { dragRef.current = d; setDrag(d) }

  const targetAt = (x: number, y: number) => {
    const el = typeof document !== 'undefined' ? document.elementFromPoint(x, y)?.closest('[data-drop]') : null
    return el?.getAttribute('data-drop') ?? null
  }
  const onPointerDown = useCallback((source: DragSource) => (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    const el = e.currentTarget
    const timer = setTimeout(() => { if (press.current && !press.current.dragging) { press.current.long = true; handlers.inspect(source.id) } }, LONG_PRESS)
    const entry = { source, x: e.clientX, y: e.clientY, pointerId: e.pointerId, timer, long: false, dragging: false, el }
    press.current = entry
    // If the release never reaches the card (re-rendered or released elsewhere), the press is cancelled here, so
    // no stale long-press timer can open an inspection later. React's own handlers run first when they do fire.
    const release = (ev: PointerEvent) => {
      if (ev.pointerId !== entry.pointerId) return
      window.removeEventListener('pointerup', release); window.removeEventListener('pointercancel', release)
      if (press.current === entry) { if (entry.timer) clearTimeout(entry.timer); press.current = null; if (dragRef.current) set(null) }
    }
    window.addEventListener('pointerup', release); window.addEventListener('pointercancel', release)
  }, [handlers])
  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const p = press.current
    if (!p || p.pointerId !== e.pointerId || p.long) return
    const dx = e.clientX - p.x, dy = e.clientY - p.y
    if (!p.dragging) {
      if (Math.hypot(dx, dy) < SLOP) return
      const upwards = dy < -SLOP && Math.abs(dy) > Math.abs(dx) * 1.2
      // A card that cannot be dragged now, or a horizontal move in the hand (native scroll), just cancels the press.
      if (p.source.fixed || (p.source.kind === 'hand' && !upwards)) { if (p.timer) clearTimeout(p.timer); press.current = null; return }
      p.dragging = true; if (p.timer) clearTimeout(p.timer)
      try { p.el.setPointerCapture(e.pointerId) } catch { /* capture is best effort */ }
    }
    e.preventDefault()
    const over = targetAt(e.clientX, e.clientY)
    set({ ...p.source, x: e.clientX, y: e.clientY, over: over && handlers.accepts(p.source, over) ? over : null })
  }, [handlers])
  const finish = useCallback((e: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
    const p = press.current
    if (!p || p.pointerId !== e.pointerId) return
    if (p.timer) clearTimeout(p.timer)
    press.current = null
    const current = dragRef.current
    if (p.dragging) {
      set(null)
      const over = cancelled ? null : targetAt(e.clientX, e.clientY)
      if (over && handlers.accepts(p.source, over)) handlers.drop(p.source, over)
      return
    }
    if (!p.long && !cancelled && !current) handlers.tap(p.source.id)
  }, [handlers])
  return {
    drag,
    bind: (source: DragSource) => ({
      onPointerDown: onPointerDown(source), onPointerMove, onPointerUp: (e: ReactPointerEvent<HTMLElement>) => finish(e, false), onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => finish(e, true),
      onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
      // Keyboard activation (Enter/Space) produces a click with detail 0: open the card like a tap.
      onClick: (e: { detail: number }) => { if (e.detail === 0) handlers.tap(source.id) },
    }),
  }
}
