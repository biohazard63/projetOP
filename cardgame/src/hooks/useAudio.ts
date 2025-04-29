import { useCallback } from 'react'

export function useAudio() {
  const playRareCardSound = useCallback(() => {
    const audio = new Audio('/sounds/rare-card.mp3')
    audio.play().catch(error => console.error('Erreur lors de la lecture du son:', error))
    // Arrêter le son après 5 secondes
    setTimeout(() => {
      audio.pause()
      audio.currentTime = 0
    }, 5000)
  }, [])

  const playAltArtSound = useCallback(() => {
    const audio = new Audio('/sounds/alt-art.mp3')
    audio.play().catch(error => console.error('Erreur lors de la lecture du son:', error))
    // Arrêter le son après 5 secondes
    setTimeout(() => {
      audio.pause()
      audio.currentTime = 0
    }, 5000)
  }, [])

  const playSpecialCardSound = useCallback(() => {
    const audio = new Audio('/sounds/special-card.mp3')
    audio.play().catch(error => console.error('Erreur lors de la lecture du son:', error))
    // Arrêter le son après 5 secondes
    setTimeout(() => {
      audio.pause()
      audio.currentTime = 0
    }, 5000)
  }, [])

  const playUltraRareSound = useCallback(() => {
    const audio = new Audio('/sounds/ultra-rare.mp3')
    audio.play().catch(error => console.error('Erreur lors de la lecture du son:', error))
    // Arrêter le son après 5 secondes
    setTimeout(() => {
      audio.pause()
      audio.currentTime = 0
    }, 5000)
  }, [])

  const playNewCardSound = useCallback(() => {
    const audio = new Audio('/sounds/new-card.mp3')
    audio.play().catch(error => console.error('Erreur lors de la lecture du son:', error))
    // Arrêter le son après 5 secondes
    setTimeout(() => {
      audio.pause()
      audio.currentTime = 0
    }, 5000)
  }, [])

  return {
    playRareCardSound,
    playAltArtSound,
    playSpecialCardSound,
    playUltraRareSound,
    playNewCardSound
  }
} 