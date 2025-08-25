import { useCallback, useEffect, useState } from 'react'

function isMobileDevice() {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || navigator.vendor || ''
  return /android|iphone|ipad|ipod|mobile/i.test(ua) || window.innerWidth < 768
}

const STORAGE_KEY = 'mugiwara:soundsEnabled'

export function useSoundSetting() {
  const [soundsEnabled, setSoundsEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'true') return true
    if (stored === 'false') return false
    // Par défaut: désactiver sur mobile pour respecter le mode silencieux, activer sur desktop
    return !isMobileDevice()
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, String(soundsEnabled))
    }
  }, [soundsEnabled])

  return { soundsEnabled, setSoundsEnabled }
}

export function useAudio() {
  const { soundsEnabled } = useSoundSetting()

  const playIfAllowed = useCallback((src: string, maxMs = 2500) => {
    if (!soundsEnabled) return
    try {
      const audio = new Audio(src)
      audio.play().catch(() => { /* silencieux/autoplay bloqué: on ignore */ })
      window.setTimeout(() => { try { audio.pause(); audio.currentTime = 0 } catch {} }, maxMs)
    } catch {}
  }, [soundsEnabled])

  const playRareCardSound = useCallback(() => {
    playIfAllowed('/sounds/rare-card.mp3')
  }, [playIfAllowed])

  const playAltArtSound = useCallback(() => {
    playIfAllowed('/sounds/alt-art.mp3')
  }, [playIfAllowed])



  const playUltraRareSound = useCallback(() => {
    playIfAllowed('/sounds/ultra-rare.mp3')
  }, [playIfAllowed])

  const playNewCardSound = useCallback(() => {
    playIfAllowed('/sounds/new-card.mp3')
  }, [playIfAllowed])

  return {
    useSoundSetting,
    playRareCardSound,
    playAltArtSound,
    playUltraRareSound,
    playNewCardSound
  }
} 