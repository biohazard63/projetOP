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
    if (typeof window === 'undefined') return true
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'true') return true
    if (stored === 'false') return false
    // Par défaut: désactiver sur mobile pour respecter le mode silencieux, activer sur desktop
    return !isMobileDevice()
  })

  const [isSilentMode, setIsSilentMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(SILENT_MODE_KEY) === 'true'
  })

  // Détection du mode silencieux iOS optimisée pour iOS 18
  useEffect(() => {
    if (!isIOS()) return

    let audioContext: AudioContext | null = null

    const detectSilentMode = async () => {
      try {
        // Méthode 1: Test avec AudioContext (plus fiable pour iOS 18)
        if (!audioContext) {
          audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        }
        
        // Vérifier l'état du contexte
        if (audioContext.state === 'suspended') {
          await audioContext.resume()
        }
        
        // Créer un son de test très court et silencieux
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.frequency.setValueAtTime(8000, audioContext.currentTime) // Fréquence haute (moins audible)
        gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime) // Volume extrêmement bas
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.001)
        
        // Si on arrive ici, le son a été joué
        setIsSilentMode(false)
        window.localStorage.setItem(SILENT_MODE_KEY, 'false')
        console.log('Mode silencieux iOS: NON détecté (AudioContext)')
        
      } catch (error) {
        // Méthode 2: Fallback avec Audio element
        try {
          const testAudio = new Audio()
          testAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'
          testAudio.volume = 0.01 // Volume encore plus bas
          
          await testAudio.play()
          
          setIsSilentMode(false)
          window.localStorage.setItem(SILENT_MODE_KEY, 'false')
          console.log('Mode silencieux iOS: NON détecté (Audio element)')
          
          testAudio.pause()
          testAudio.currentTime = 0
          
        } catch (fallbackError) {
          // Si les deux méthodes échouent, on est en mode silencieux
          console.log('Mode silencieux détecté sur iOS (les deux méthodes ont échoué)')
          setIsSilentMode(true)
          window.localStorage.setItem(SILENT_MODE_KEY, 'true')
        }
      }
    }

    // Détecter au chargement avec un délai pour iOS 18
    setTimeout(() => {
      detectSilentMode()
      
      // Écouter les changements d'état du contexte audio après création
      if (audioContext) {
        audioContext.addEventListener('statechange', () => {
          console.log('État du contexte audio iOS:', audioContext?.state)
          if (audioContext?.state === 'running') {
            setIsSilentMode(false)
            window.localStorage.setItem(SILENT_MODE_KEY, 'false')
          } else if (audioContext?.state === 'suspended') {
            setIsSilentMode(true)
            window.localStorage.setItem(SILENT_MODE_KEY, 'true')
          }
        })
      }
    }, 500)

    // Réécouter les changements de focus et visibilité
    const handleFocus = () => {
      setTimeout(detectSilentMode, 200)
    }
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(detectSilentMode, 300)
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      
      // Nettoyer le contexte audio
      if (audioContext) {
        audioContext.close()
      }
    }
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
  const { soundsEnabled, isSilentMode, isIOS } = useSoundSetting()

  const playIfAllowed = useCallback((src: string, maxMs = 2500) => {
    // Ne pas jouer si les sons sont désactivés
    if (!soundsEnabled) return
    
    // Sur iOS, vérifier le mode silencieux
    if (isIOS && isSilentMode) {
      console.log('Son ignoré: mode silencieux iOS détecté')
      return
    }
    
    try {
      const audio = new Audio(src)
      audio.volume = 0.3 // Volume réduit pour éviter les surprises
      audio.play().catch((error) => { 
        console.log('Audio bloqué:', error.message)
        // Si l'audio est bloqué, on peut être en mode silencieux
        if (isIOS) {
          window.localStorage.setItem(SILENT_MODE_KEY, 'true')
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
  }, [soundsEnabled, isSilentMode, isIOS])

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

  // Fonction pour forcer l'activation des sons (pour les utilisateurs qui veulent)
  const enableExplicitSound = useCallback(() => {
    window.localStorage.setItem(SILENT_MODE_KEY, 'false')
    window.location.reload() // Recharger pour appliquer les changements
  }, [])

  // Fonction pour vérifier si on peut jouer des sons
  const shouldPlaySound = useCallback(() => {
    return soundsEnabled && (!isIOS || !isSilentMode)
  }, [soundsEnabled, isIOS, isSilentMode])

  return {
    useSoundSetting,
    playRareCardSound,
    playAltArtSound,
    playUltraRareSound,
    playNewCardSound,
    enableExplicitSound,
    shouldPlaySound,
    isSilentMode,
    isIOS
  }
} 