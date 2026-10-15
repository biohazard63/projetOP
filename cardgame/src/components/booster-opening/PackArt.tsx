'use client'
import Image from 'next/image'
import { useState, type CSSProperties } from 'react'
import PRESENTATION from '@/lib/boosters/booster-presentation.json'

// Every booster packet at the same size: the packet's measured bounding box (scripts/boosters/booster-presentation.ts) fills
// a fixed 3:5 frame, whatever canvas the artwork comes on. Without a measured frame, the artwork is simply contained.
const FRAMES = (PRESENTATION as { frames: Record<string, { x: number; y: number; w: number; h: number; width: number; height: number }> }).frames
const FRAME_ASPECT = 0.6

function placement(src: string): CSSProperties | null {
  const f = FRAMES[src]
  if (!f) return null
  const ratio = f.width / f.height, crop = (f.w * f.width) / (f.h * f.height)
  if (crop < FRAME_ASPECT) { // the packet is narrower than the frame: fit its height, centre it horizontally
    const h = 100 / f.h, w = h * ratio / FRAME_ASPECT
    return { position: 'absolute', maxWidth: 'none', height: `${h}%`, width: `${w}%`, top: `${-f.y * h}%`, left: `${(100 - f.w * w) / 2 - f.x * w}%` }
  }
  const w = 100 / f.w, h = w / ratio * FRAME_ASPECT
  return { position: 'absolute', maxWidth: 'none', width: `${w}%`, height: `${h}%`, left: `${-f.x * w}%`, top: `${(100 - f.h * h) / 2 - f.y * h}%` }
}

export default function PackArt({ src, alt, testId, eager, className }: { src?: string | null; alt: string; testId?: string; eager?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false)
  const image = !failed && src ? src : '/images/booster-pack.png'
  const style = placement(image)
  return <div className={`pack-art${className ? ` ${className}` : ''}`} data-testid={testId ? `${testId}-frame` : undefined}>
    <Image draggable={false} data-testid={testId} src={image} alt={alt} width={670} height={670} sizes="(max-width: 640px) 60vw, 320px" loading={eager ? 'eager' : 'lazy'}
      className={style ? undefined : 'pack-art-contain'} style={style ?? undefined} onError={() => setFailed(true)} />
  </div>
}
