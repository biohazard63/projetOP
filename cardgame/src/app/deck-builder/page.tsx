'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card as UICard } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import CardModal, { Card } from '@/components/CardModal'

interface Deck {
  id: string
  name: string
  deckCards: { cardId: string; quantity: number }[]
}

export default function DeckBuilderPage() {
  const { data: session } = useSession()
  const [availableCards, setAvailableCards] = useState<Card[]>([])
  const [currentDeck, setCurrentDeck] = useState<Deck>({
    id: '',
    name: 'Nouveau Deck',
    deckCards: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    color: 'all',
    rarity: 'all'
  })
  const [isEditing, setIsEditing] = useState(false)
  const [deckName, setDeckName] = useState('')
  const [selectedCards, setSelectedCards] = useState<Card[]>([])
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const cardsPerPage = 15

  // Récupérer l'ID du deck depuis l'URL
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const deckId = searchParams.get('deckId')

  useEffect(() => {
    const fetchCards = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log('Deck Builder: Début de la récupération des cartes')
        
        const response = await fetch('/api/collection', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        console.log('Deck Builder: Statut de la réponse:', response.status)
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error('Deck Builder: Erreur de réponse:', errorData)
          throw new Error(errorData.message || 'Erreur lors de la récupération des cartes')
        }

        const data = await response.json()
        console.log('Deck Builder: Données reçues:', data.cards?.length || 0, 'cartes')
        
        setAvailableCards(data.cards || [])
      } catch (error) {
        console.error('Deck Builder: Erreur lors de la récupération:', error)
        setError(error instanceof Error ? error.message : 'Une erreur est survenue')
      } finally {
        setLoading(false)
      }
    }

    fetchCards()
  }, [])

  // Charger un deck existant si un ID est fourni
  useEffect(() => {
    const loadDeck = async () => {
      if (deckId) {
        try {
          const response = await fetch(`/api/decks/${deckId}`)
          if (!response.ok) {
            throw new Error('Erreur lors du chargement du deck')
          }
          const deck = await response.json()
          console.log('Deck chargé:', deck)
          
          if (!deck) {
            throw new Error('Format de deck invalide')
          }

          setDeckName(deck.name || 'Nouveau Deck')
          
          // Vérifier si le deck a des cartes et les formater correctement
          if (deck.deckCards && Array.isArray(deck.deckCards)) {
            // Récupérer les détails complets des cartes depuis availableCards
            const cardsWithDetails = deck.deckCards.map((deckCard: any) => {
              const cardDetails = availableCards.find(card => card.id === deckCard.cardId)
              if (cardDetails) {
                return {
                  ...cardDetails,
                  quantity: deckCard.quantity || 1
                }
              }
              return null
            }).filter(Boolean) // Enlever les cartes null
            setSelectedCards(cardsWithDetails)
          } else {
            setSelectedCards([])
          }
          
          setIsEditing(true)
        } catch (error) {
          console.error('Erreur:', error)
          setError('Erreur lors du chargement du deck')
        }
      }
    }
    loadDeck()
  }, [deckId, availableCards])

  const addCardToDeck = (card: Card) => {
    // Vérifier si la carte est déjà dans le deck
    const existingCardIndex = selectedCards.findIndex(c => c.id === card.id)
    
    // Vérifier si on a déjà 4 copies de la carte
    if (existingCardIndex !== -1) {
      const currentQuantity = selectedCards[existingCardIndex].quantity || 1
      if (currentQuantity >= 4) {
        alert('Vous ne pouvez pas avoir plus de 4 copies de la même carte')
        return
      }
    }
    
    // Calculer le nombre total de cartes non-leader
    const nonLeaderCards = selectedCards.filter(c => c.type !== 'LEADER')
    const totalNonLeaderCount = nonLeaderCards.reduce((sum, c) => sum + (c.quantity || 1), 0)
    
    // Vérifier si l'ajout de la carte dépasserait la limite
    if (card.type !== 'LEADER' && totalNonLeaderCount >= 50) {
      alert('Vous ne pouvez pas avoir plus de 50 cartes non-leader dans votre deck')
      return
    }
    
    // Vérifier si c'est un leader et s'il y en a déjà un
    if (card.type === 'LEADER' && selectedCards.some(c => c.type === 'LEADER')) {
      alert('Vous ne pouvez avoir qu\'un seul leader dans votre deck')
      return
    }

    if (existingCardIndex !== -1) {
      // Augmenter la quantité si la carte existe déjà
      const updatedCards = [...selectedCards]
      updatedCards[existingCardIndex] = {
        ...updatedCards[existingCardIndex],
        quantity: (updatedCards[existingCardIndex].quantity || 1) + 1
      }
      setSelectedCards(updatedCards)
    } else {
      // Ajouter la carte avec une quantité de 1
      setSelectedCards([...selectedCards, { ...card, quantity: 1 }])
    }
  }

  const removeCardFromDeck = (cardId: string) => {
    const card = selectedCards.find(c => c.id === cardId);
    if (!card) return;

    if ((card.quantity || 1) > 1) {
      setSelectedCards(
        selectedCards.map(c =>
          c.id === cardId
            ? { ...c, quantity: (c.quantity || 1) - 1 }
            : c
        )
      );
    } else {
      setSelectedCards(selectedCards.filter(c => c.id !== cardId));
    }
  };

  const filteredCards = availableCards.filter(card => {
    if (filters.search && !card.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }
    if (filters.type !== 'all' && card.type !== filters.type) return false
    if (filters.color !== 'all' && card.color !== filters.color) return false
    if (filters.rarity !== 'all' && card.rarity !== filters.rarity) return false
    return true
  })

  // Calculer les cartes à afficher pour la page courante
  const indexOfLastCard = currentPage * cardsPerPage
  const indexOfFirstCard = indexOfLastCard - cardsPerPage
  const currentCards = filteredCards.slice(indexOfFirstCard, indexOfLastCard)
  const totalPages = Math.ceil(filteredCards.length / cardsPerPage)

  // Fonction pour changer de page
  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveDeck = async () => {
    try {
      // Vérifier les règles du deck avant de sauvegarder
      const leaderCards = selectedCards.filter(card => card.type === 'LEADER');
      const nonLeaderCards = selectedCards.filter(card => card.type !== 'LEADER');
      
      // Calculer le nombre total de cartes en tenant compte de la quantité
      const leaderCount = leaderCards.reduce((sum, card) => sum + (card.quantity || 1), 0);
      const nonLeaderCount = nonLeaderCards.reduce((sum, card) => sum + (card.quantity || 1), 0);
      
      console.log('Validation du deck:', {
        leaderCards: leaderCards.map(card => ({ name: card.name, quantity: card.quantity })),
        nonLeaderCards: nonLeaderCards.map(card => ({ name: card.name, quantity: card.quantity })),
        leaderCount,
        nonLeaderCount,
        totalCards: leaderCount + nonLeaderCount
      });

      if (leaderCount !== 1) {
        alert(`Le deck doit contenir exactement 1 leader (actuellement: ${leaderCount})`);
        return;
      }
      
      if (nonLeaderCount !== 50) {
        alert(`Le deck doit contenir exactement 50 cartes non-leader (actuellement: ${nonLeaderCount})`);
        return;
      }

      const url = isEditing ? `/api/decks/${deckId}` : '/api/decks';
      const method = isEditing ? 'PUT' : 'POST';
      
      // Préparer les données dans le bon format
      const deckData = {
        name: deckName,
        cards: selectedCards.map(card => ({
          id: card.id,
          quantity: card.quantity || 1
        }))
      };

      console.log('URL:', url);
      console.log('Méthode:', method);
      console.log('Données envoyées:', JSON.stringify(deckData, null, 2));
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(deckData),
      });

      console.log('Statut de la réponse:', response.status);
      console.log('Headers de la réponse:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erreur de réponse:', errorData);
        throw new Error(errorData.error || errorData.message || 'Erreur lors de la sauvegarde du deck');
      }

      const savedDeck = await response.json();
      console.log('Deck sauvegardé:', savedDeck);
      router.push('/decks');
    } catch (error) {
      console.error('Erreur détaillée:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde du deck');
    }
  };

  const handleCardClick = (card: Card) => {
    setSelectedCard(card)
    setIsModalOpen(true)
  }

  const handleAddCard = (card: Card) => {
    addCardToDeck(card)
    setIsModalOpen(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-4 md:p-8 text-white">
      <div className="container mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 md:mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500">
          {isEditing ? 'Modifier le Deck' : 'Créateur de Deck'}
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
          {/* Section des cartes disponibles */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="bg-gray-800/80 rounded-lg shadow-xl p-4 md:p-6 backdrop-blur-sm border border-gray-700">
              <h2 className="text-xl md:text-2xl font-semibold mb-4 text-white">Cartes Disponibles</h2>
              
              {/* Filtres */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <Input
                  type="text"
                  placeholder="Rechercher une carte..."
                  value={filters.search}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, search: e.target.value }))
                    setCurrentPage(1) // Réinitialiser à la première page lors d'une recherche
                  }}
                  className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-red-500 focus:border-red-500"
                />
                <Select
                  value={filters.type}
                  onValueChange={(value) => {
                    setFilters(prev => ({ ...prev, type: value }))
                    setCurrentPage(1) // Réinitialiser à la première page lors d'un changement de filtre
                  }}
                >
                  <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all" className="text-white hover:bg-gray-700">Tous les types</SelectItem>
                    <SelectItem value="LEADER" className="text-white hover:bg-gray-700">Leader</SelectItem>
                    <SelectItem value="CHARACTER" className="text-white hover:bg-gray-700">Personnage</SelectItem>
                    <SelectItem value="EVENT" className="text-white hover:bg-gray-700">Événement</SelectItem>
                    <SelectItem value="STAGE" className="text-white hover:bg-gray-700">Stage</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.color}
                  onValueChange={(value) => {
                    setFilters(prev => ({ ...prev, color: value }))
                    setCurrentPage(1) // Réinitialiser à la première page lors d'un changement de filtre
                  }}
                >
                  <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                    <SelectValue placeholder="Couleur" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all" className="text-white hover:bg-gray-700">Toutes les couleurs</SelectItem>
                    <SelectItem value="Red" className="text-white hover:bg-gray-700">Rouge</SelectItem>
                    <SelectItem value="Blue" className="text-white hover:bg-gray-700">Bleu</SelectItem>
                    <SelectItem value="Green" className="text-white hover:bg-gray-700">Vert</SelectItem>
                    <SelectItem value="Purple" className="text-white hover:bg-gray-700">Violet</SelectItem>
                    <SelectItem value="Black" className="text-white hover:bg-gray-700">Noir</SelectItem>
                    <SelectItem value="Yellow" className="text-white hover:bg-gray-700">Jaune</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.rarity}
                  onValueChange={(value) => {
                    setFilters(prev => ({ ...prev, rarity: value }))
                    setCurrentPage(1) // Réinitialiser à la première page lors d'un changement de filtre
                  }}
                >
                  <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                    <SelectValue placeholder="Rareté" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all" className="text-white hover:bg-gray-700">Toutes les raretés</SelectItem>
                    <SelectItem value="C" className="text-white hover:bg-gray-700">Commune</SelectItem>
                    <SelectItem value="UC" className="text-white hover:bg-gray-700">Peu commune</SelectItem>
                    <SelectItem value="R" className="text-white hover:bg-gray-700">Rare</SelectItem>
                    <SelectItem value="SR" className="text-white hover:bg-gray-700">Super Rare</SelectItem>
                    <SelectItem value="L" className="text-white hover:bg-gray-700">Légendaire</SelectItem>
                    <SelectItem value="SEC" className="text-white hover:bg-gray-700">Secret Rare</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Grille de cartes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
                {currentCards.map((card) => (
                  <UICard
                    key={card.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 bg-gray-700/50 border-gray-600 overflow-hidden"
                    onClick={() => handleCardClick(card)}
                  >
                    <div className="relative aspect-[3/4]">
                      <Image
                        src={card.imageUrl}
                        alt={card.name}
                        fill
                        className="object-cover rounded-t-lg"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <h3 className="font-semibold text-xs md:text-sm truncate text-white">{card.name}</h3>
                        <div className="flex justify-between text-xs text-gray-300">
                          <span>{card.type}</span>
                          <span>{card.cost} ⭐</span>
                        </div>
                      </div>
                    </div>
                  </UICard>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="bg-gray-700/50 border-gray-600 text-white hover:bg-gray-600 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Logique pour afficher les numéros de page avec des ellipses
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => paginate(pageNum)}
                          className={`${
                            currentPage === pageNum 
                              ? "bg-red-600 hover:bg-red-700 text-white" 
                              : "bg-gray-700/50 border-gray-600 text-white hover:bg-gray-600"
                          }`}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="bg-gray-700/50 border-gray-600 text-white hover:bg-gray-600 disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <div className="text-center text-sm text-gray-400 mt-2">
                Affichage de {indexOfFirstCard + 1}-{Math.min(indexOfLastCard, filteredCards.length)} sur {filteredCards.length} cartes
              </div>
            </div>
          </div>

          {/* Section du deck en cours */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="bg-gray-800/80 rounded-lg shadow-xl p-4 md:p-6 backdrop-blur-sm border border-gray-700 sticky top-4">
              <h2 className="text-xl md:text-2xl font-semibold mb-4 text-white">Mon Deck</h2>
              
              <div className="mb-4">
                <Input
                  type="text"
                  placeholder="Nom du deck"
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  className="mb-4 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-red-500 focus:border-red-500"
                />
                
                <div className="text-sm text-gray-300 mb-4 bg-gray-700/30 p-3 rounded-lg">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="font-medium">Leader: <span className="text-red-400">{selectedCards.filter(card => card.type === 'LEADER').reduce((sum, card) => sum + (card.quantity || 1), 0)}/1</span></p>
                      <p className="font-medium">Autres cartes: <span className="text-red-400">{selectedCards.filter(card => card.type !== 'LEADER').reduce((sum, card) => sum + (card.quantity || 1), 0)}/50</span></p>
                      <p className="font-medium">Total: <span className="text-red-400">{selectedCards.reduce((sum, card) => sum + (card.quantity || 1), 0)}/51</span></p>
                    </div>
                    <div>
                      <p className="font-medium">Personnages: <span className="text-blue-400">{selectedCards.filter(card => card.type === 'CHARACTER').reduce((sum, card) => sum + (card.quantity || 1), 0)}</span></p>
                      <p className="font-medium">Événements: <span className="text-green-400">{selectedCards.filter(card => card.type === 'EVENT').reduce((sum, card) => sum + (card.quantity || 1), 0)}</span></p>
                      <p className="font-medium">Stages: <span className="text-yellow-400">{selectedCards.filter(card => card.type === 'STAGE').reduce((sum, card) => sum + (card.quantity || 1), 0)}</span></p>
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full bg-gradient-to-r from-red-600 via-red-500 to-orange-500 hover:from-red-700 hover:via-red-600 hover:to-orange-600 text-white py-2 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  onClick={saveDeck}
                >
                  Sauvegarder le Deck
                </Button>
              </div>

              {/* Liste des cartes sélectionnées */}
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {selectedCards.map((card, index) => (
                  <div
                    key={`${card.id}-${index}`}
                    className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="relative w-14 h-20 flex-shrink-0">
                        <Image
                          src={card.imageUrl}
                          alt={card.name}
                          fill
                          className="object-cover rounded"
                          sizes="(max-width: 768px) 56px, 112px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{card.name}</p>
                        <p className="text-xs text-gray-400 mt-1">x{card.quantity || 1}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-3">
                      <Button
                        onClick={() => addCardToDeck(card)}
                        className="h-8 w-8 p-0 bg-gray-600 hover:bg-gray-500 text-white flex items-center justify-center"
                      >
                        +
                      </Button>
                      <Button
                        onClick={() => removeCardFromDeck(card.id)}
                        className="h-8 w-8 p-0 bg-gray-600 hover:bg-gray-500 text-white flex items-center justify-center"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <CardModal
        card={selectedCard}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddToDeck={handleAddCard}
      />
    </div>
  )
} 