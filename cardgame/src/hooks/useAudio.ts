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
    // Par défaut: activé pour que les utilisateurs puissent entendre les sons
    return true
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, String(soundsEnabled))
    }
  }, [soundsEnabled])

  return { 
    soundsEnabled, 
    setSoundsEnabled
  }
}

export function useAudio() {
  const getSoundsEnabled = () => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  }

  const playIfAllowed = useCallback((src: string, maxMs = 2500) => {
    // Ne pas jouer si les sons sont désactivés
    if (!getSoundsEnabled()) return

    try {
      const audio = new Audio(src)
      audio.volume = 0.3 // Volume réduit pour éviter les surprises
      audio.play().catch((error) => { 
        console.log('Audio bloqué:', (error as Error)?.message || error)
      })
      window.setTimeout(() => { 
        try { 
          audio.pause(); 
          audio.currentTime = 0 
        } catch {} 
      }, maxMs)
    } catch (error) {
      console.log('Erreur audio:', error)
    }
  }, [])

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

  const playPackOpenSound = useCallback(() => {
    // Son d'ouverture de booster - durée ajustée à l'animation (maintenant ~3.5s)
    playIfAllowed('/sounds/ouverture.mp3', 5000)
  }, [playIfAllowed])

  // Fonction pour vérifier si on peut jouer des sons
  const shouldPlaySound = useCallback(() => {
    return getSoundsEnabled()
  }, [])

  return {
    useSoundSetting,
    playRareCardSound,
    playAltArtSound,
    playUltraRareSound,
    playNewCardSound,
    playPackOpenSound,
    shouldPlaySound,
    isSilentMode: false,
    isIOS: false
  }
}
