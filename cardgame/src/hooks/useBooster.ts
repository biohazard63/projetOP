import { useCallback } from 'react'
import { ExtendedCardType } from '@/types/card'

export function useBooster() {
  const openBooster = useCallback(async (setCode: string) => {
    try {
      const response = await fetch('/api/booster/open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ setCode })
      })
      
      const data = await response.json()
      
      if (data.success) {
        return {
          success: true,
          cards: data.cards,
          newCardsCount: data.newCardsCount,
          hasRareCard: data.hasRareCard
        }
      } else {
        return {
          success: false,
          error: data.error
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture du booster:', error)
      return {
        success: false,
        error: 'Erreur lors de l\'ouverture du booster'
      }
    }
  }, [])

  const addToCollection = useCallback(async (cardIds: string[]) => {
    try {
      const response = await fetch('/api/booster/add-to-collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cardIds })
      })
      
      const data = await response.json()
      
      if (data.success) {
        return {
          success: true,
          message: 'Cartes ajoutées à la collection avec succès'
        }
      } else {
        return {
          success: false,
          error: data.error
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout à la collection:', error)
      return {
        success: false,
        error: 'Erreur lors de l\'ajout à la collection'
      }
    }
  }, [])

  const isUltraRareCard = useCallback((card: ExtendedCardType) => {
    return card.rarity === 'mythic' || card.imageUrl?.includes('_p1')
  }, [])

  const getRarityColor = useCallback((rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'text-gray-400'
      case 'uncommon':
        return 'text-green-400'
      case 'rare':
        return 'text-blue-400'
      case 'mythic':
        return 'text-purple-400'
      default:
        return 'text-gray-400'
    }
  }, [])

  const getRarityGlow = useCallback((rarity: string) => {
    switch (rarity) {
      case 'common':
        return ''
      case 'uncommon':
        return 'shadow-lg shadow-green-500/20'
      case 'rare':
        return 'shadow-lg shadow-blue-500/20'
      case 'mythic':
        return 'shadow-lg shadow-purple-500/20'
      default:
        return ''
    }
  }, [])

  return {
    openBooster,
    addToCollection,
    isUltraRareCard,
    getRarityColor,
    getRarityGlow
  }
} 