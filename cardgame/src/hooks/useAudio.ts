import { useCallback, useEffect, useState } from 'react'

function isMobileDevice() {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || navigator.vendor || ''
  return /android|iphone|ipad|ipod|mobile/i.test(ua) || window.innerWidth < 768
}

function isIOS() {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || navigator.vendor || ''
  return /iphone|ipad|ipod/i.test(ua)
}

const STORAGE_KEY = 'mugiwara:soundsEnabled'
const SILENT_MODE_KEY = 'mugiwara:isSilentMode'

export function useSoundSetting() {
  const [soundsEnabled, setSoundsEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'true') return true
    if (stored === 'false') return false
    // Par défaut global: désactivé pour éviter les surprises en public
    return false
  })

  const [isSilentMode, setIsSilentMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(SILENT_MODE_KEY) === 'true'
  })

  // Détection du mode silencieux iOS
  useEffect(() => {
    if (!isIOS()) return

    const detectSilentMode = async () => {
      try {
        // Créer un audio temporaire pour tester le mode silencieux
        const testAudio = new Audio()
        testAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'
        testAudio.volume = 0.1
        
        // Essayer de jouer l'audio
        await testAudio.play()
        
        // Si on arrive ici, l'audio a été joué (pas en mode silencieux)
        setIsSilentMode(false)
        window.localStorage.setItem(SILENT_MODE_KEY, 'false')
        
        // Arrêter immédiatement
        testAudio.pause()
        testAudio.currentTime = 0
        
      } catch (error) {
        // Si l'audio ne peut pas être joué, on est probablement en mode silencieux
        console.log('Mode silencieux détecté sur iOS')
        setIsSilentMode(true)
        window.localStorage.setItem(SILENT_MODE_KEY, 'true')
      }
    }

    // Détecter au chargement
    detectSilentMode()

    // Réécouter les changements de focus (quand l'utilisateur revient sur l'app)
    const handleFocus = () => {
      setTimeout(detectSilentMode, 100)
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, String(soundsEnabled))
    }
  }, [soundsEnabled])

  return { 
    soundsEnabled, 
    setSoundsEnabled, 
    isSilentMode, 
    setIsSilentMode,
    isIOS: isIOS()
  }
}

export function useAudio() {
  const isiOS = isIOS()

  const getSoundsEnabled = () => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  }

  const getIsSilentMode = () => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(SILENT_MODE_KEY) === 'true'
  }

  const playIfAllowed = useCallback((src: string, maxMs = 2500) => {
    // Ne pas jouer si les sons sont désactivés (préférence live)
    if (!getSoundsEnabled()) return

    // Sur iOS, vérifier le mode silencieux live
    if (isiOS && getIsSilentMode()) {
      console.log('Son ignoré: mode silencieux iOS détecté')
      return
    }

    try {
      const audio = new Audio(src)
      audio.volume = 0.3 // Volume réduit pour éviter les surprises
      audio.play().catch((error) => { 
        console.log('Audio bloqué:', (error as Error)?.message || error)
        // Si l'audio est bloqué, on peut être en mode silencieux
        if (isiOS) {
          try { window.localStorage.setItem(SILENT_MODE_KEY, 'true') } catch {}
        }
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
  }, [isiOS])

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
    // Son d'ouverture de booster
    playIfAllowed('/sounds/ouverture.mp3', 3500)
  }, [playIfAllowed])

  // Fonction pour forcer l'activation des sons (pour les utilisateurs qui veulent)
  const enableExplicitSound = useCallback(() => {
    try { window.localStorage.setItem(SILENT_MODE_KEY, 'false') } catch {}
  }, [])

  // Fonction pour vérifier si on peut jouer des sons
  const shouldPlaySound = useCallback(() => {
    return getSoundsEnabled() && (!isiOS || !getIsSilentMode())
  }, [isiOS])

  return {
    useSoundSetting,
    playRareCardSound,
    playAltArtSound,
    playUltraRareSound,
    playNewCardSound,
    playPackOpenSound,
    enableExplicitSound,
    shouldPlaySound,
    isSilentMode: getIsSilentMode(),
    isIOS: isiOS
  }
}
