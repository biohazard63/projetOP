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
