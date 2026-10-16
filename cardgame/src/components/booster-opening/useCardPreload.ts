'use client'
import { useEffect } from 'react'
import { getImageProps } from 'next/image'
import type { OpeningCard } from '@/lib/boosters/types'

// Match the actual reveal container, including the smaller short-screen layout.
export const revealImageSizes = '(max-height: 740px) min(65vw, 245px), min(75vw, 300px)'

export function useCardPreload(cards: OpeningCard[] | undefined, index: number) {
  useEffect(() => {
    if (!cards?.length) return
    // Only the current card and its two neighbours: never download the catalogue.
    const images = cards.slice(Math.max(0, index), Math.max(0, index) + 3).map(card => {
      const { props } = getImageProps({ src: card.imageUrl || '/images/card-back.jpg', alt: '', width: 300, height: 420, sizes: revealImageSizes })
      const image = new window.Image()
      image.decoding = 'async'
      image.sizes = props.sizes || ''
      image.srcset = props.srcSet || ''
      image.src = props.src
      // Decode ahead of the tap; failed images remain handled by the visible image.
      void image.decode().catch(() => {})
      return image
    })
    return () => { images.forEach(image => { image.onload = null; image.onerror = null }) }
  }, [cards, index])
}

// Same props as the fan of StackReveal: the browser then reuses the downloaded file.
export const fanImageSizes = '(max-width:640px) 22vw, 140px'
/** Downloads and decodes the fan images of a pack ahead of time (the next pack of a batch). */
export function preloadFan(cards: OpeningCard[] | undefined) {
  for (const card of cards ?? []) {
    const { props } = getImageProps({ src: card.imageUrl || '/images/card-back.jpg', alt: '', width: 180, height: 252, sizes: fanImageSizes })
    const image = new window.Image()
    image.decoding = 'async'; image.sizes = props.sizes || ''; image.srcset = props.srcSet || ''; image.src = props.src
    void image.decode().catch(() => {})
  }
}
