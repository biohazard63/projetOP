'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Image from 'next/image'
import CardModal from '@/components/CardModal'
import { motion } from 'framer-motion'
import { Search, ChevronLeft, ChevronRight, Filter, SortAsc, SortDesc } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Card {
  id: string
  code: string
  name: string
  type: string
  color: string
  cost: number
  power?: number
  counter?: number
  effect?: string
  rarity: string
  imageUrl: string
  set?: string
  attribute?: string
  attributeImage?: string
  family?: string
  ability?: string
  trigger?: string
  notes?: string
}

type CardSet = typeof cardSets[number];

interface Filters {
  search: string
  type: string
  color: string
  rarity: string
  set: CardSet
}

interface SortOption {
  value: string;
  label: string;
  order: 'asc' | 'desc';
}

const sortOptions: SortOption[] = [
  { value: 'name', label: 'Nom (A-Z)', order: 'asc' },
  { value: 'name', label: 'Nom (Z-A)', order: 'desc' },
  { value: 'cost', label: 'Coût (croissant)', order: 'asc' },
  { value: 'cost', label: 'Coût (décroissant)', order: 'desc' },
  { value: 'power', label: 'Puissance (croissante)', order: 'asc' },
  { value: 'power', label: 'Puissance (décroissante)', order: 'desc' },
  { value: 'set', label: 'Set (A-Z)', order: 'asc' },
  { value: 'set', label: 'Set (Z-A)', order: 'desc' },
];

// Valeurs exactes des types et raretés
const cardTypes = [
  { value: 'all', label: 'Tous les types' },
  { value: 'LEADER', label: 'Leader' },
  { value: 'CHARACTER', label: 'Personnage' },
  { value: 'EVENT', label: 'Événement' },
  { value: 'STAGE', label: 'Stage' },
]

const cardColors = [
  { value: 'all', label: 'Toutes les couleurs' },
  { value: 'Red', label: 'Rouge' },
  { value: 'Blue', label: 'Bleu' },
  { value: 'Green', label: 'Vert' },
  { value: 'Purple', label: 'Violet' },
  { value: 'Black', label: 'Noir' },
  { value: 'Yellow', label: 'Jaune' },
  { value: 'Red/Green', label: 'Rouge/Vert' },
  { value: 'Blue/Yellow', label: 'Bleu/Jaune' },
  { value: 'Black/Yellow', label: 'Noir/Jaune' },
  { value: 'Blue/Purple', label: 'Bleu/Violet' },
  { value: 'Green/Yellow', label: 'Vert/Jaune' },
  { value: 'Red/Blue', label: 'Rouge/Bleu' },
  { value: 'Green/Purple', label: 'Vert/Violet' },
  { value: 'Green/Black', label: 'Vert/Noir' },
  { value: 'Blue/Black', label: 'Bleu/Noir' },
  { value: 'Purple/Yellow', label: 'Violet/Jaune' },
  { value: 'Red/Black', label: 'Rouge/Noir' },
  { value: 'Green/Blue', label: 'Vert/Bleu' },
  { value: 'Red/Purple', label: 'Rouge/Violet' },
  { value: 'Purple/Black', label: 'Violet/Noir' },
]

const cardRarities = [
  { value: 'all', label: 'Toutes les raretés' },
  { value: 'C', label: 'Commune' },
  { value: 'UC', label: 'Peu commune' },
  { value: 'R', label: 'Rare' },
  { value: 'SR', label: 'Super Rare' },
  { value: 'L', label: 'Légendaire' },
  { value: 'SEC', label: 'Secret Rare' },
  { value: 'P', label: 'Promotion' },
  { value: 'TR', label: 'Trésor' },
  { value: 'SP CARD', label: 'Carte Spéciale' },
]

const rarityColors = {
  'C': 'bg-gray-200',
  'UC': 'bg-green-200',
  'R': 'bg-blue-200',
  'SR': 'bg-purple-200',
  'L': 'bg-yellow-200',
  'SEC': 'bg-red-200',
  'P': 'bg-pink-200',
  'TR': 'bg-orange-200',
  'SP CARD': 'bg-indigo-200'
}

// Sets disponibles
const cardSets = [
  'all',
  '-3D2Y- [ST-14]',
  '-500 YEARS IN THE FUTURE- [OP-07]',
  '-Absolute Justice- [ST-06]',
  '-Animal Kingdom Pirates-[ST-04]',
  '-Black Smoker- [ST-19]',
  '-Blue Donquixote Doflamingo- [ST-17]',
  '-EMPERORS IN THE NEW WORLD- [OP-09]',
  '-Green Uta- [ST-16]',
  '-KINGDOMS OF INTRIGUE- [OP04]',
  '-Memorial Collection- [EB-01]',
  '-Monkey D. Luffy-[ST-08]',
  '-ONE PIECE CARD THE BEST- [PRB-01]',
  '-PARAMOUNT WAR- [OP02]',
  '-PILLARS OF STRENGTH- [OP03]',
  '-Purple Monkey.D.Luffy- [ST-18]',
  '-ROMANCE DAWN- [OP01]',
  '-Red Edward.Newgate- [ST-15]',
  '-Straw Hat Crew-[ST-01]',
  '-TWO LEGENDS- [OP-08]',
  '-The Seven Warlords of the Sea-[ST-03]',
  '-The Three Brothers-[ST13]',
  '-The Three Captains-[ST-10]',
  '-Uta-[ST-11]',
  '-WINGS OF THE CAPTAIN-[OP06]',
  '-Worst Generation-[ST-02]',
  '-Yamato-[ST-09]',
  '-Yellow Charlotte Katakuri- [ST-20]',
  '-Zoro & Sanji- [ST-12]',
  'Anime Expo 2023',
  'Big Mom Pirates [ST-07]',
  'Event Pack Vol.3',
  'GIFT COLLECTION 2023 [GC-01]',
  'Included in Event Pack Vol.1',
  'Included in Event Pack Vol.2',
  'Included in FILM RED Promotion Card Set',
  'Included in Online Regional Participation Pack Vol.1',
  'Included in Pirates Party Card Vol.1',
  'Included in Pirates Party Card Vol.2',
  'Included in Promotion Pack 2022',
  'ONE PIECE FILM edition [ST-05]',
  'OP-05',
  'Pirates Party Vol.3',
  'Pirates Party Vol.4',
  'Pirates Party Vol.5',
  'Pirates Party Vol.6',
  'Pirates Party Vol.7',
  'Pre-Release OP02',
  'Pre-Release OP03',
  'Pre-Release OP04',
  'Pre-Release OP06',
  'Premium Card Collection -25th Edition-',
  'Premium Card Collection -FILM RED Edition-',
  'Regional 2024 wave1',
  'Sealed Battle 2023 Vol.1',
  'Sealed Battle Kit Vol.1',
  'Special Goods Set -Ace/Sabo/Luffy-',
  'Super Pre-Release',
  'Tournament Pack Vol.1',
  'Tournament Pack Vol.2',
  'Tournament Pack Vol.3',
  'Tournament Pack Vol.4',
  'Tournament Pack Vol.5',
  'Tournament Pack Vol.6',
  'Tournament Pack Vol.7',
  'Winner prize for Sealed Battle 2023 Vol.1'
] as const;

export default function CollectionPage() {
  const { data: session } = useSession()
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const cardsPerPage = 24
  const [filters, setFilters] = useState<Filters>({
    search: '',
    type: 'all',
    color: 'all',
    rarity: 'all',
    set: 'all'
  })
  const [sortBy, setSortBy] = useState<string>(`${sortOptions[0].value}-${sortOptions[0].order}`)

  useEffect(() => {
    const fetchCards = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log('Collection: Début de la récupération des cartes')
        
        const response = await fetch('/api/collection', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Important pour les cookies de session
        })

        console.log('Collection: Statut de la réponse:', response.status)
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error('Collection: Erreur de réponse:', errorData)
          throw new Error(errorData.message || 'Erreur lors de la récupération des cartes')
        }

        const data = await response.json()
        console.log('Collection: Données reçues:', data.length, 'cartes')
        
        if (!Array.isArray(data)) {
          console.error('Collection: Format de données invalide:', data)
          throw new Error('Format de données invalide')
        }

        setCards(data)
        console.log('Collection: État mis à jour avec succès')
      } catch (error) {
        console.error('Collection: Erreur lors de la récupération:', error)
        setError(error instanceof Error ? error.message : 'Une erreur est survenue')
      } finally {
        setLoading(false)
      }
    }

    fetchCards()
  }, [])

  const filteredAndSortedCards = cards
    .filter((card) => {
      if (filters.search && !card.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      if (filters.type !== 'all' && card.type !== filters.type) return false;
      if (filters.color !== 'all' && card.color !== filters.color) return false;
      if (filters.rarity !== 'all' && card.rarity !== filters.rarity) return false;
      if (filters.set !== 'all' && card.set !== filters.set) return false;
      return true;
    })
    .sort((a, b) => {
      const [value, order] = sortBy.split('-');
      const multiplier = order === 'asc' ? 1 : -1;

      switch (value) {
        case 'name':
          return multiplier * a.name.localeCompare(b.name);
        case 'cost':
          return multiplier * ((a.cost || 0) - (b.cost || 0));
        case 'power':
          return multiplier * ((a.power || 0) - (b.power || 0));
        case 'set':
          return multiplier * (a.set || '').localeCompare(b.set || '');
        default:
          return 0;
      }
    });

  // Calcul de la pagination
  const totalPages = Math.ceil(filteredAndSortedCards.length / cardsPerPage);
  const indexOfLastCard = currentPage * cardsPerPage;
  const indexOfFirstCard = indexOfLastCard - cardsPerPage;
  const currentCards = filteredAndSortedCards.slice(indexOfFirstCard, indexOfLastCard);

  // Fonction pour changer de page
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    // Réinitialiser la page courante quand les filtres changent
    setCurrentPage(1);
  }, [filters, sortBy]);

  const handleCardClick = (card: Card) => {
    setSelectedCard(card)
    setIsModalOpen(true)
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

  console.log('Cartes:', cards.map(card => ({
    id: card.id,
    name: card.name,
    code: card.code,
    rarity: card.rarity,
    type: card.type,

    
  })))

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-4 md:p-8 text-white">
      <div className="container mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 md:mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500">
          Ma Collection
        </h1>
        
        <div className="bg-gray-800/80 rounded-lg shadow-xl p-4 md:p-6 backdrop-blur-sm border border-gray-700 mb-6">
          <p className="text-gray-300 text-sm md:text-base">
            Utilisez les filtres ci-dessous pour trouver des cartes spécifiques dans votre collection. Vous pouvez filtrer par type, couleur, rareté et set.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="md:col-span-5">
            <div className="relative">
              <Input
                type="text"
                placeholder="Rechercher une carte par nom..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-red-500 focus:border-red-500"
              />
              <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          
          <Select
            value={filters.type}
            onValueChange={(value) => setFilters({ ...filters, type: value })}
          >
            <SelectTrigger className="w-full bg-gray-700/50 border-gray-600 text-white">
              <SelectValue placeholder="Type de carte" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {cardTypes.map((type) => (
                <SelectItem key={type.value} value={type.value} className="text-white hover:bg-gray-700">
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.color}
            onValueChange={(value) => setFilters({ ...filters, color: value })}
          >
            <SelectTrigger className="w-full bg-gray-700/50 border-gray-600 text-white">
              <SelectValue placeholder="Couleur" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {cardColors.map((color) => (
                <SelectItem key={color.value} value={color.value} className="text-white hover:bg-gray-700">
                  {color.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.rarity}
            onValueChange={(value) => setFilters({ ...filters, rarity: value })}
          >
            <SelectTrigger className="w-full bg-gray-700/50 border-gray-600 text-white">
              <SelectValue placeholder="Rareté" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {cardRarities.map((rarity) => (
                <SelectItem key={rarity.value} value={rarity.value} className="text-white hover:bg-gray-700">
                  {rarity.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.set}
            onValueChange={(value: CardSet) => setFilters(prev => ({ ...prev, set: value }))}
          >
            <SelectTrigger className="w-full bg-gray-700/50 border-gray-600 text-white">
              <SelectValue placeholder="Sélectionner un set" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {cardSets.map((set) => (
                <SelectItem key={set} value={set} className="text-white hover:bg-gray-700">
                  {set === 'all' ? 'Tous les sets' : set}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
          <p className="text-gray-400 text-sm">
            Affichage de {indexOfFirstCard + 1}-{Math.min(indexOfLastCard, filteredAndSortedCards.length)} sur {filteredAndSortedCards.length} cartes
          </p>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Trier par:</span>
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value)}
            >
              <SelectTrigger className="w-[180px] bg-gray-700/50 border-gray-600 text-white">
                <SelectValue placeholder="Trier par..." />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {sortOptions.map((option) => (
                  <SelectItem 
                    key={`${option.value}-${option.order}`} 
                    value={`${option.value}-${option.order}`}
                    className="text-white hover:bg-gray-700"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {currentCards.length > 0 ? (
            currentCards.map((card) => (
              <motion.div
                key={card.id}
                className={`bg-gray-800/80 rounded-lg shadow-xl overflow-hidden cursor-pointer backdrop-blur-sm border border-gray-700 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] ${rarityColors[card.rarity as keyof typeof rarityColors]}`}
                onClick={() => handleCardClick(card)}
                whileHover={{ y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="relative aspect-[3/4]">
                  <Image
                    src={card.imageUrl}
                    alt={card.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/placeholder-card.jpg'
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <h3 className="font-semibold text-xs md:text-sm truncate text-white">{card.name}</h3>
                    <div className="flex justify-between text-xs text-gray-300">
                      <span>{card.type}</span>
                      <span>{card.cost} ⭐</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 bg-gray-800/80 rounded-lg shadow-xl backdrop-blur-sm border border-gray-700">
              <p className="text-gray-400 text-lg mb-4">Aucune carte ne correspond à vos critères de recherche.</p>
              <button 
                className="px-4 py-2 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 hover:from-red-700 hover:via-red-600 hover:to-orange-600 text-white rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg"
                onClick={() => setFilters({
                  search: '',
                  type: 'all',
                  color: 'all',
                  rarity: 'all',
                  set: 'all',
                })}
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>

        {/* Message d'aide */}
        {currentCards.length > 0 && (
          <div className="text-center py-4 mt-4">
            <p className="text-gray-400 text-sm">Cliquez sur une carte pour voir plus de détails.</p>
          </div>
        )}

        {/* Pagination */}
        {filteredAndSortedCards.length > cardsPerPage && (
          <div className="flex justify-center mt-8 gap-2">
            <Button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="bg-gray-700/50 border-gray-600 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`${
                      currentPage === pageNumber 
                        ? "bg-red-600 hover:bg-red-700 text-white" 
                        : "bg-gray-700/50 border-gray-600 text-white hover:bg-gray-600"
                    }`}
                  >
                    {pageNumber}
                  </Button>
                );
              })}
              
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="px-2 py-2 text-gray-400">...</span>
                  <Button
                    onClick={() => handlePageChange(totalPages)}
                    className="bg-gray-700/50 border-gray-600 text-white hover:bg-gray-600"
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>

            <Button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="bg-gray-700/50 border-gray-600 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <CardModal
          card={selectedCard}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    </div>
  )
} 