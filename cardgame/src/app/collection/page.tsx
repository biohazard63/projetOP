'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Image from 'next/image'
import CardModal from '@/components/CardModal'
import { motion } from 'framer-motion'
import { Search, ChevronLeft, ChevronRight, Filter, SortAsc, SortDesc, Heart } from 'lucide-react'
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
  isOwned?: boolean
  isFavorite?: boolean
  quantity?: number
}

type CardSet = typeof cardSets[number];

interface Filters {
  search: string
  type: string
  color: string
  rarity: string
  set: CardSet
  showOnly?: string
  favoritesOnly?: boolean
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

interface UserCard {
  cardId: string
  quantity: number
}

interface UserFavorite {
  cardId: string
}

interface UserData {
  cards: UserCard[]
  favorites: UserFavorite[]
}

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
    set: 'all',
    favoritesOnly: false
  })
  const [sortBy, setSortBy] = useState<string>('set-asc')
  const [showMissingCards, setShowMissingCards] = useState(false);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [missingCards, setMissingCards] = useState<Card[]>([]);
  const [loadingAllCards, setLoadingAllCards] = useState(false);

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
        credentials: 'include',
      })

      console.log('Collection: Statut de la réponse:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Collection: Erreur de réponse:', errorData)
        throw new Error(errorData.message || 'Erreur lors de la récupération des cartes')
      }

      const data = await response.json()
      console.log('Collection: Données reçues:', data.cards?.length || 0, 'cartes')
      
      // Récupérer les favoris et les quantités en une seule requête
      const userDataResponse = await fetch('/api/user/cards', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!userDataResponse.ok) {
        throw new Error('Erreur lors de la récupération des données utilisateur')
      }

      const userData = await userDataResponse.json() as UserData
      const userCardsMap = new Map(userData.cards.map((card: UserCard) => [card.cardId, card]))
      const userFavoritesSet = new Set(userData.favorites.map((favorite: UserFavorite) => favorite.cardId))

      // Combiner les données
      const cardsWithUserData = (data.cards || []).map((card: Card) => ({
        ...card,
        quantity: userCardsMap.get(card.id)?.quantity || 0,
        isFavorite: userFavoritesSet.has(card.id)
      }))
      
      setCards(cardsWithUserData)
    } catch (error) {
      console.error('Collection: Erreur lors de la récupération:', error)
      setError(error instanceof Error ? error.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllCards = async () => {
    try {
      setLoadingAllCards(true)
      console.log('Début de la récupération de toutes les cartes disponibles')
      
      const response = await fetch('/api/cards')
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération de toutes les cartes')
      }
      
      const data = await response.json()
      console.log('Réponse de l\'API /api/cards:', data)
      
      let allCardsData: Card[] = []
      if (Array.isArray(data)) {
        allCardsData = data
      } else if (data.cards && Array.isArray(data.cards)) {
        allCardsData = data.cards
      } else {
        console.error('Format de réponse inattendu de l\'API /api/cards')
        setAllCards([])
        setMissingCards([])
        return
      }
      
      console.log('Toutes les cartes disponibles récupérées:', allCardsData.length)
      setAllCards(allCardsData)
      
      // Calculer les cartes manquantes
      const userCardIds = new Set(cards.map(card => card.id))
      const missing = allCardsData.filter(card => !userCardIds.has(card.id))
      console.log('Cartes manquantes calculées:', missing.length)
      
      setMissingCards(missing)
    } catch (error) {
      console.error('Erreur lors de la récupération de toutes les cartes:', error)
      setAllCards([])
      setMissingCards([])
    } finally {
      setLoadingAllCards(false)
    }
  }

  // Modifier la fonction pour obtenir toutes les cartes (possédées et manquantes)
  const getAllCards = () => {
    if (!allCards.length) return [];
    
    console.log('Début de getAllCards');
    console.log('Nombre total de cartes disponibles:', allCards.length);
    console.log('Nombre de cartes possédées:', cards.length);
    
    // Créer un Map pour stocker les cartes par ID
    const cardsMap = new Map();
    
    // Ajouter toutes les cartes disponibles
    allCards.forEach(card => {
      // Vérifier si l'utilisateur possède cette carte
      const userCard = cards.find(userCard => userCard.id === card.id);
      cardsMap.set(card.id, { 
        ...card, 
        isOwned: !!userCard,
        quantity: userCard?.quantity || 0,
        isFavorite: userCard?.isFavorite || false
      });
    });
    
    // Convertir le Map en tableau et trier
    const sortedCards = Array.from(cardsMap.values()).sort((a, b) => {
      // Extraire le numéro de carte du code (ex: "OP01-001" -> 1)
      const getCardNumber = (code: string) => {
        const match = code.match(/-(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      };
      
      // Extraire le numéro de set (ex: "OP01" -> 1)
      const getSetNumber = (set: string) => {
        const match = set.match(/OP(\d+)/);
        return match ? parseInt(match[1]) : 0;
      };
      
      // Comparer d'abord par numéro de set
      const setNumberCompare = getSetNumber(a.set || '') - getSetNumber(b.set || '');
      if (setNumberCompare !== 0) return setNumberCompare;
      
      // Si même set, comparer par numéro de carte
      const cardNumberCompare = getCardNumber(a.code) - getCardNumber(b.code);
      return cardNumberCompare;
    });

    console.log('Cartes triées:', sortedCards.map(card => ({
      code: card.code,
      set: card.set,
      name: card.name,
      isOwned: card.isOwned,
      quantity: card.quantity
    })));

    return sortedCards;
  };
  
  // Modifier la variable filteredAndSortedCards pour utiliser getAllCards
  const filteredAndSortedCards = (showMissingCards ? getAllCards() : cards)
    .filter((card) => {
      if (filters.search && !card.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      if (filters.type !== 'all' && card.type !== filters.type) return false;
      if (filters.color !== 'all' && card.color !== filters.color) return false;
      if (filters.rarity !== 'all' && card.rarity !== filters.rarity) return false;
      if (filters.set !== 'all' && card.set !== filters.set) return false;
      
      // Si on est en mode "cartes manquantes", on peut filtrer pour ne voir que les cartes manquantes
      if (showMissingCards && filters.showOnly === 'missing' && card.isOwned) return false;
      if (showMissingCards && filters.showOnly === 'owned' && !card.isOwned) return false;
      
      // Filtre pour les favoris
      if (filters.favoritesOnly && !card.isFavorite) return false;
      
      return true;
    })
    .sort((a, b) => {
      const [value, order] = sortBy.split('-');
      const multiplier = order === 'asc' ? 1 : -1;

      // Gérer les valeurs nulles ou undefined
      const getValue = (card: Card, key: string) => {
        const val = card[key as keyof Card];
        if (val === undefined || val === null) return '';
        return val;
      };

      let result = 0;
      switch (value) {
        case 'name':
          result = multiplier * String(getValue(a, 'name')).localeCompare(String(getValue(b, 'name')));
          break;
        case 'cost':
          result = multiplier * (Number(getValue(a, 'cost')) - Number(getValue(b, 'cost')));
          break;
        case 'power':
          result = multiplier * (Number(getValue(a, 'power')) - Number(getValue(b, 'power')));
          break;
        case 'set':
          // Pour le tri par set, on utilise la même logique que dans getAllCards
          const getSetNumber = (set: string) => {
            const match = set.match(/OP(\d+)/);
            return match ? parseInt(match[1]) : 0;
          };
          const getCardNumber = (code: string) => {
            const match = code.match(/-(\d+)$/);
            return match ? parseInt(match[1]) : 0;
          };
          
          const setNumberCompare = getSetNumber(a.set || '') - getSetNumber(b.set || '');
          if (setNumberCompare !== 0) {
            result = multiplier * setNumberCompare;
          } else {
            result = multiplier * (getCardNumber(a.code) - getCardNumber(b.code));
          }
          break;
        default:
          result = 0;
      }

      console.log(`Tri: ${value}-${order}`, {
        a: { 
          name: a.name, 
          set: a.set,
          code: a.code,
          value: getValue(a, value) 
        },
        b: { 
          name: b.name, 
          set: b.set,
          code: b.code,
          value: getValue(b, value) 
        },
        result
      });

      return result;
    });

  console.log('Cartes filtrées et triées:', filteredAndSortedCards.map(card => ({
    code: card.code,
    set: card.set,
    name: card.name,
    isOwned: card.isOwned,
    quantity: card.quantity,
    sortValue: card[sortBy.split('-')[0] as keyof Card]
  })));

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

  // Chargement initial des cartes
  useEffect(() => {
    fetchCards()
  }, [])

  // Chargement des cartes manquantes uniquement quand showMissingCards change
  useEffect(() => {
    if (showMissingCards) {
      fetchAllCards()
    }
  }, [showMissingCards])

  // Réinitialiser la page courante quand les filtres changent
  useEffect(() => {
    setCurrentPage(1)
  }, [filters, sortBy, showMissingCards])

  const handleCardClick = (card: Card) => {
    setSelectedCard(card)
    setIsModalOpen(true)
  }

  const handleToggleFavorite = async (cardId: string) => {
    try {
      // Vérifier si la carte est déjà en favoris
      const isCurrentlyFavorite = cards.find(card => card.id === cardId)?.isFavorite;
      
      const response = await fetch('/api/user/favorites', {
        method: isCurrentlyFavorite ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cardId }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour des favoris');
      }

      // Mettre à jour l'état local des cartes
      setCards(prevCards => 
        prevCards.map(card => 
          card.id === cardId 
            ? { ...card, isFavorite: !card.isFavorite } 
            : card
        )
      );

      // Mettre à jour la carte sélectionnée si elle est ouverte dans la modal
      if (selectedCard && selectedCard.id === cardId) {
        setSelectedCard(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
      }

      // Afficher une notification de succès
      const action = isCurrentlyFavorite ? 'supprimée' : 'ajoutée';
      console.log(`Carte ${action} des favoris avec succès`);
    } catch (error) {
      console.error('Erreur lors de la mise à jour des favoris:', error);
    }
  };

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

  const CardGrid = ({ cards }: { cards: Card[] }) => {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {cards.map((card) => (
          <div
            key={card.id}
            className={`impel-down-card group relative aspect-[3/4] rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer ${
              showMissingCards && !card.isOwned ? 'opacity-50 grayscale hover:grayscale-0 hover:opacity-100' : ''
            }`}
            onClick={() => handleCardClick(card)}
          >
            <Image
              src={card.imageUrl}
              alt={card.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120]/90 via-[#1B2A4A]/50 to-transparent" />
            
            {/* Badge de rareté stylisé Impel Down */}
            <div className="absolute top-2 left-2">
              <span className={`px-2 py-1 text-xs font-bold rounded-full border border-red-900/30 ${
                card.rarity === 'L' ? 'bg-yellow-500/80 text-black' :
                card.rarity === 'SR' ? 'bg-purple-500/80 text-white' :
                card.rarity === 'SEC' ? 'bg-red-500/80 text-white' :
                card.rarity === 'R' ? 'bg-blue-500/80 text-white' :
                'bg-gray-500/80 text-white'
              } shadow-[0_0_10px_rgba(255,0,0,0.3)]`}>
                {card.rarity}
              </span>
            </div>

            {/* Badge de quantité stylisé */}
            {card.quantity && card.quantity > 0 && (
              <div className="absolute bottom-2 right-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-900/80 text-white text-sm font-bold border border-red-500/30 shadow-[0_0_10px_rgba(255,0,0,0.3)]">
                  x{card.quantity}
                </div>
              </div>
            )}

            {/* Icône de favori stylisée */}
            {card.isFavorite && (
              <div className="absolute bottom-2 left-2">
                <Heart className="w-6 h-6 text-red-500 fill-red-500 drop-shadow-[0_0_5px_rgba(255,0,0,0.5)]" />
              </div>
            )}

            {/* Nom de la carte stylisé */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-[#0B1120] to-transparent">
              <div className="flex items-center gap-2">
                <h3 className="text-red-300 font-semibold text-sm truncate drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                  {card.name}
                </h3>
              </div>
            </div>

            {/* Badge "Recherché" pour les cartes manquantes */}
            {showMissingCards && !card.isOwned && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-red-900/90 text-white text-sm font-bold px-4 py-2 rounded-full shadow-[0_0_20px_rgba(255,0,0,0.3)] border border-red-500/30">
                  Recherché
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-7xl relative z-10 p-4 pt-20">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 md:mb-8 text-center">
        <span className="bg-gradient-to-r from-red-600 via-red-500 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
          Prison de Collection - Niveau 6
        </span>
      </h1>
      
      {/* Statistiques avec thème prison */}
      <div className="bg-[#1B2A4A]/80 rounded-lg shadow-xl p-4 md:p-6 backdrop-blur-sm border border-red-900/30 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col items-center justify-center p-4 bg-[#0B1120]/50 rounded-lg border border-red-900/20">
            <h3 className="text-lg font-semibold text-red-400">Prisonniers Capturés</h3>
            <p className="text-3xl font-bold text-red-500">{cards.length}</p>
          </div>
          
          <div className="flex flex-col items-center justify-center p-4 bg-[#0B1120]/50 rounded-lg border border-red-900/20">
            <h3 className="text-lg font-semibold text-red-400">Criminels Recherchés</h3>
            <p className="text-3xl font-bold text-red-500">{allCards.length || 2250}</p>
          </div>
          
          <div className="flex flex-col items-center justify-center p-4 bg-[#0B1120]/50 rounded-lg border border-red-900/20">
            <h3 className="text-lg font-semibold text-red-400">Taux de Capture</h3>
            <div className="w-full max-w-xs mx-auto mt-2">
              <div className="h-4 bg-[#0B1120] rounded-full overflow-hidden border border-red-900/20">
                <div 
                  className="h-full bg-gradient-to-r from-red-700 to-red-500" 
                  style={{ width: `${Math.round((cards.length / (allCards.length || 2250)) * 100)}%` }}
                ></div>
              </div>
              <p className="text-2xl font-bold text-red-500 mt-1">
                {Math.round((cards.length / (allCards.length || 2250)) * 100)}%
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="md:col-span-5">
          <div className="relative">
            <Input
              type="text"
              placeholder="Rechercher un prisonnier..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 bg-[#0B1120]/50 border-red-900/30 text-white placeholder-red-200/50 focus:ring-red-500 focus:border-red-500"
            />
            <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-red-500" />
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
        
        {/* Nouveau filtre pour afficher toutes les cartes, seulement les cartes possédées ou seulement les cartes manquantes */}
        {showMissingCards && (
          <Select
            value={filters.showOnly || 'all'}
            onValueChange={(value) => setFilters(prev => ({ ...prev, showOnly: value }))}
          >
            <SelectTrigger className="w-full bg-gray-700/50 border-gray-600 text-white">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all" className="text-white hover:bg-gray-700">
                Toutes les cartes
              </SelectItem>
              <SelectItem value="owned" className="text-white hover:bg-gray-700">
                Cartes possédées
              </SelectItem>
              <SelectItem value="missing" className="text-white hover:bg-gray-700">
                Cartes manquantes
              </SelectItem>
            </SelectContent>
          </Select>
        )}
        
        {/* Ajouter le filtre pour les favoris */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.favoritesOnly}
              onChange={(e) => setFilters({ ...filters, favoritesOnly: e.target.checked })}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700/50 text-red-500 focus:ring-red-500"
            />
            <span className="text-sm text-gray-300">Afficher uniquement les favoris</span>
          </label>
        </div>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setShowMissingCards(!showMissingCards)}
            className={`${showMissingCards ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'} text-white`}
          >
            {showMissingCards ? 'Voir ma collection' : 'Voir toutes les cartes'}
          </Button>
          {showMissingCards && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-300">
                {missingCards.length} cartes manquantes sur {allCards.length} cartes totales
                ({Math.round((missingCards.length / allCards.length) * 100)}% manquantes)
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">
            {showMissingCards ? `${allCards.length} cartes au total` : `${cards.length} cartes dans ma collection`}
          </span>
        </div>
      </div>
      
      {showMissingCards && missingCards.length === 0 && allCards.length > 0 && (
        <div className="bg-gradient-to-r from-green-900/80 to-emerald-900/80 rounded-lg shadow-xl p-4 md:p-6 backdrop-blur-sm border border-green-700 mb-6 text-center">
          <h2 className="text-2xl font-bold text-green-400 mb-2">Félicitations !</h2>
          <p className="text-gray-200">
            Vous avez toutes les cartes disponibles dans votre collection ! 
            Votre collection est complète à 100%.
          </p>
        </div>
      )}

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

      <CardGrid cards={currentCards} />

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
        onToggleFavorite={handleToggleFavorite}
      />
    </div>
  )
} 