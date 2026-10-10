'use client'

import Image from 'next/image'
import { useState } from 'react'

export default function BoosterArtwork({ src, alt, testId }: { src?: string | null; alt: string; testId?: string }) {
  const [failed, setFailed] = useState(false)
  const image = !failed && src ? src : '/images/booster-pack.png'
  // Bandai thumbnails place the packet inside a 247px square beige canvas.
  // Crop its outer margin in the UI; keep the printed artwork untouched.
  const crop = /^https:\/\/en\.onepiece-cardgame\.com\/images\/products\/boosters\/[^/]+\/img_thumbnail\.png$/.test(image)
  const localCanvas = /^\/images\/booster\/op\d+\.png$/.test(image)
  return <div className="relative mx-auto h-60 aspect-[133/217] drop-shadow-2xl">
    <div data-testid={testId ? `${testId}-frame` : undefined} className="absolute inset-0 overflow-hidden">
      <Image draggable={false} data-testid={testId} src={image} alt={alt} width={247} height={247} sizes={crop ? '310px' : localCanvas ? '300px' : '240px'}
        className={crop || localCanvas ? 'absolute max-w-none object-contain' : 'h-full w-full object-contain'}
        style={crop ? { width: '185.714%', height: '113.825%', left: '-42.857%', top: '-6.912%' } : localCanvas ? { width: '151.515%', height: '92.86%', left: '-25.7575%', top: '3.57%' } : undefined}
        onError={() => setFailed(true)} />
    </div>
  </div>
}
