import { useState, useCallback, useEffect } from 'react'
import { ExtendedCardType } from '@/types/card'

export function useCollection() {
  const [userCollection, setUserCollection] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  const loadUserCollection = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/user/collection')
      const data = await response.json()
      
      if (data.success) {
        setUserCollection(new Set(data.cards.map((card: ExtendedCardType) => card.id)))
      } else {
        console.error('Erreur lors du chargement de la collection:', data.error)
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la collection:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUserCollection()
  }, [loadUserCollection])

  return {
    userCollection,
    isLoading,
    loadUserCollection
  }
} 