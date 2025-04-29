import { useCallback } from 'react'

export function useAudio() {
  const playRareCardSound = useCallback(() => {
    const audio = new Audio('/sounds/rare-card.mp3')
    audio.play().catch(error => console.error('Erreur lors de la lecture du son:', error))
  }, [])

  const playAltArtSound = useCallback(() => {
    const audio = new Audio('/sounds/alt-art.mp3')
    audio.play().catch(error => console.error('Erreur lors de la lecture du son:', error))
  }, [])

  const playSpecialCardSound = useCallback(() => {
    const audio = new Audio('/sounds/special-card.mp3')
    audio.play().catch(error => console.error('Erreur lors de la lecture du son:', error))
  }, [])

  const playUltraRareSound = useCallback(() => {
    const audio = new Audio('/sounds/ultra-rare.mp3')
    audio.play().catch(error => console.error('Erreur lors de la lecture du son:', error))
  }, [])

  const playNewCardSound = useCallback(() => {
    const audio = new Audio('/sounds/new-card.mp3')
    audio.play().catch(error => console.error('Erreur lors de la lecture du son:', error))
  }, [])

  return {
    playRareCardSound,
    playAltArtSound,
    playSpecialCardSound,
    playUltraRareSound,
    playNewCardSound
  }
} 