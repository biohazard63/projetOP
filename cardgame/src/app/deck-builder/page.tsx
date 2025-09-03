'use client'

import { useState, useEffect, useMemo, useCallback, useTransition } from 'react'
import { useSession } from 'next-auth/react'
import { Card as UICard } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import CardModal from '@/components/CardModal'
import Link from 'next/link'



interface DeckCard {
  id: string
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
  setCode?: string
  code?: string
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

export default function DeckBuilderPage() {
  const { status } = useSession()
  const [availableCards, setAvailableCards] = useState<DeckCard[]>([])
  // État supprimé (non utilisé)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    color: 'all',
    rarity: 'all',
    set: 'all',
    favoritesOnly: false,
    onlyOwned: false,
    leadersFirst: false
  })
  const [isEditing, setIsEditing] = useState(false)
  const [deckName, setDeckName] = useState('')
  const [selectedCards, setSelectedCards] = useState<DeckCard[]>([])
  const [selectedCard, setSelectedCard] = useState<DeckCard | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const cardsPerPage = isMobile ? 12 : 15
  const [, startTransition] = useTransition()

  // Récupérer l'ID du deck depuis l'URL (App Router)
  const searchParams = useSearchParams()
  const deckId = searchParams?.get('deckId')

  // Détection mobile
  useEffect(() => {
    const check = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Redirection si non connecté
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=${encodeURIComponent('/deck-builder')}`)
    }
  }, [status, router])

  useEffect(() => {
    const fetchCards = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log('Deck Builder: Début de la récupération des cartes')
        
        // Récupérer les cartes et les favoris en parallèle
        const [collectionResponse, favoritesResponse] = await Promise.all([
          fetch('/api/collection', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          }),
          fetch('/api/user/cards', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          })
        ])

        if (!collectionResponse.ok || !favoritesResponse.ok) {
          throw new Error('Erreur lors de la récupération des données')
        }

        const [collectionData, userData] = await Promise.all([
          collectionResponse.json(),
          favoritesResponse.json()
        ])

        // Créer un Map pour les quantités et les favoris
        const quantitiesMap = new Map(
          userData.cards.map((card: { cardId: string; quantity: number }) => [
            card.cardId,
            card.quantity
          ])
        )
        const favoritesMap = new Map(
          userData.favorites.map((favorite: { cardId: string }) => [
            favorite.cardId,
            true
          ])
        )

        // Combiner les données
        const cardsWithData = collectionData.cards.map((card: DeckCard) => ({
          ...card,
          quantity: quantitiesMap.get(card.id) || 0,
          isFavorite: favoritesMap.has(card.id)
        }))

        setAvailableCards(cardsWithData)
      } catch (error) {
        console.error('Erreur lors de la récupération:', error)
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
          if (deck.cards && Array.isArray(deck.cards)) {
            setSelectedCards(deck.cards)
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
  }, [deckId])

  // Fonction pour valider et nettoyer le deck selon le leader actuel
  const validateAndCleanDeck = (newLeader?: DeckCard) => {
    if (!newLeader) return; // Pas de leader, pas de validation
    
    console.log('🔍 Validation du deck avec le nouveau leader:', newLeader.name);
    console.log('🔍 Cartes actuelles dans le deck:', selectedCards.map(c => `${c.name} (${c.type}, ${c.color})`));
    
    // Filtrer les cartes incompatibles (NE JAMAIS RETIRER LES LEADERS)
    const removedCards: DeckCard[] = [];
    const validCards = selectedCards.filter(card => {
      // TOUJOURS garder les leaders, peu importe leur couleur
      if (card.type === 'LEADER') {
        console.log(`✅ Leader conservé: ${card.name} (${card.color})`);
        return true;
      }
      
      // Vérifier la compatibilité des cartes non-leader avec le NOUVEAU leader
      const isCompatible = canPlayCardWithLeader(card, newLeader);
      if (!isCompatible) {
        removedCards.push(card);
        console.log(`❌ Carte incompatible retirée: ${card.name} (${card.color})`);
      } else {
        console.log(`✅ Carte compatible conservée: ${card.name} (${card.color})`);
      }
      return isCompatible;
    });
    
    console.log('🔍 Cartes valides après filtrage:', validCards.map(c => `${c.name} (${c.type}, ${c.color})`));
    console.log('🔍 Cartes retirées:', removedCards.map(c => `${c.name} (${c.color})`));
    
    // Si des cartes ont été retirées, mettre à jour le deck et informer l'utilisateur
    if (validCards.length !== selectedCards.length) {
      console.log(`🧹 Mise à jour du deck: ${selectedCards.length} → ${validCards.length} cartes`);
      setSelectedCards(validCards);
      const removedCount = selectedCards.length - validCards.length;
      console.log(`🧹 Deck nettoyé: ${removedCount} cartes incompatibles retirées`);
      
      // Informer l'utilisateur des cartes retirées
      if (removedCards.length > 0) {
        const removedNames = removedCards.map(c => `${c.name} (${c.color})`).join(', ');
        alert(`🔄 Deck mis à jour !\n\n${removedCount} carte(s) incompatible(s) avec votre nouveau leader "${newLeader.name}" ont été retirée(s) :\n${removedNames}\n\nCes cartes ne correspondent pas aux couleurs autorisées par votre leader.`);
      }
    } else {
      console.log('✅ Aucune carte incompatible trouvée, deck inchangé');
    }
  };

  // useEffect pour valider le deck quand un leader est ajouté
  useEffect(() => {
    const leaderCards = selectedCards.filter(c => c.type === 'LEADER');
    if (leaderCards.length > 0) {
      const currentLeader = leaderCards[0];
      console.log('🔍 useEffect: Leader détecté dans le deck, validation...');
      validateAndCleanDeck(currentLeader);
    }
  }, [selectedCards]);

  const addCardToDeck = (card: DeckCard) => {
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
    
    // Vérifier la quantité disponible dans la collection
    const availableCard = availableCards.find(c => c.id === card.id)
    if (!availableCard) {
      alert('Cette carte n\'est pas disponible dans votre collection')
      return
    }

    const currentQuantityInDeck = selectedCards.find(c => c.id === card.id)?.quantity || 0
    if (currentQuantityInDeck >= (availableCard.quantity || 0)) {
      alert(`Vous ne pouvez pas ajouter plus de cartes que vous n'en possédez (${availableCard.quantity || 0} disponible(s))`)
      return
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

    // NOUVELLE RÈGLE : Validation des couleurs selon le leader
    if (card.type !== 'LEADER') {
      const leaderCards = selectedCards.filter(c => c.type === 'LEADER')
      
      // Si on n'a pas encore de leader, permettre l'ajout temporaire
      if (leaderCards.length === 0) {
        // Permettre l'ajout mais afficher un avertissement
        console.log('Aucun leader sélectionné, carte ajoutée temporairement')
      } else {
        // Vérifier que la carte peut être jouée avec le leader (inclut les cartes multicolores)
        const leader = leaderCards[0]
        if (!canPlayCardWithLeader(card, leader)) {
          const leaderColors = getLeaderColors(leader).join('/')
          alert(`⚠️ Cette carte (${card.color}) ne peut pas être jouée avec votre leader (${leaderColors}).\n\nVous pouvez la voir dans la liste mais elle ne peut pas être ajoutée au deck.`)
          return
        }
      }
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
      const newCards = [...selectedCards, { ...card, quantity: 1 }];
      setSelectedCards(newCards);
    }
  }

  // Fonction pour traduire les couleurs (français ↔ anglais)
  const translateColor = (color: string): string => {
    const colorMap: { [key: string]: string } = {
      // Français vers Anglais
      'Rouge': 'Red',
      'Bleu': 'Blue', 
      'Vert': 'Green',
      'Violet': 'Purple',
      'Noir': 'Black',
      'Jaune': 'Yellow',
      // Anglais vers Français (pour l'affichage)
      'Red': 'Rouge',
      'Blue': 'Bleu',
      'Green': 'Vert', 
      'Purple': 'Violet',
      'Black': 'Noir',
      'Yellow': 'Jaune'
    };
    
    return colorMap[color] || color;
  };

  // Fonction pour normaliser les couleurs (toujours en anglais pour la logique)
  const normalizeColor = (color: string): string => {
    const colorMap: { [key: string]: string } = {
      'Rouge': 'Red',
      'Bleu': 'Blue',
      'Vert': 'Green', 
      'Violet': 'Purple',
      'Noir': 'Black',
      'Jaune': 'Yellow'
    };
    
    return colorMap[color] || color;
  };

  // Fonction pour déterminer les couleurs autorisées selon le leader
  const getLeaderColors = (leader: DeckCard): string[] => {
    // Logique pour déterminer les couleurs du leader
    if (!leader) return ['Red', 'Blue', 'Green', 'Purple', 'Black', 'Yellow'];
    
    // Vérifier d'abord si le leader a déjà une couleur multicolore (contient "/")
    if (leader.color && typeof leader.color === 'string') {
      const mainColor = leader.color;
      
      // Si la couleur contient "/", c'est un leader bicolore
      if (mainColor.includes('/')) {
        console.log('🎨 Leader bicolore détecté:', mainColor);
        const colors = mainColor.split('/').map(c => c.trim());
        console.log('🎨 Couleurs extraites:', colors);
        // Normaliser et valider les couleurs (gérer français et anglais)
        const validColors = colors
          .map(color => {
            // Traduire les couleurs françaises vers l'anglais
            const colorMap: { [key: string]: string } = {
              'Rouge': 'Red', 'Bleu': 'Blue', 'Vert': 'Green', 
              'Violet': 'Purple', 'Noir': 'Black', 'Jaune': 'Yellow'
            };
            return colorMap[color] || color;
          })
          .filter(color => ['Red', 'Blue', 'Green', 'Purple', 'Black', 'Yellow'].includes(color));
        console.log('✅ Couleurs valides normalisées:', validColors);
        if (validColors.length > 0) {
          return validColors;
        }
      }
      
      // Leaders mono-couleur - gérer français et anglais
      const colorMap: { [key: string]: string } = {
        'Rouge': 'Red', 'Bleu': 'Blue', 'Vert': 'Green', 
        'Violet': 'Purple', 'Noir': 'Black', 'Jaune': 'Yellow'
      };
      const normalizedColor = colorMap[mainColor] || mainColor;
      if (['Red', 'Blue', 'Green', 'Purple', 'Black', 'Yellow'].includes(normalizedColor)) {
        console.log('🎨 Leader mono-couleur normalisé:', normalizedColor);
        return [normalizedColor];
      }
    }
    
    // Leaders multi-couleurs - analyser le nom et les attributs
    if (leader.name && typeof leader.name === 'string') {
      const leaderName = leader.name.toLowerCase();
      
      // Leaders Rouge/Verte
      if (leaderName.includes('luffy') || leaderName.includes('zoro') || 
          leaderName.includes('sanji') || leaderName.includes('nami')) {
        return ['Red', 'Green'];
      }
      
      // Leaders Bleu/Violet
      if (leaderName.includes('law') || leaderName.includes('robin') || 
          leaderName.includes('chopper')) {
        return ['Blue', 'Purple'];
      }
      
      // Leaders Rouge/Bleu
      if (leaderName.includes('ace') || leaderName.includes('sabo')) {
        return ['Red', 'Blue'];
      }
      
      // Leaders Vert/Jaune
      if (leaderName.includes('yamato') || leaderName.includes('kaido')) {
        return ['Green', 'Yellow'];
      }
      
      // Leaders Rouge/Noir
      if (leaderName.includes('akainu') || leaderName.includes('blackbeard')) {
        return ['Red', 'Black'];
      }
      
      // Leaders Violet/Noir
      if (leaderName.includes('moria') || leaderName.includes('doflamingo')) {
        return ['Purple', 'Black'];
      }
    }
    
    // Vérifier les attributs du leader
    if (leader.attribute && typeof leader.attribute === 'string') {
      const attribute = leader.attribute.toLowerCase();
      
      // Attributs multi-couleurs
      if (attribute.includes('fire') || attribute.includes('flame')) {
        return ['Red', 'Yellow'];
      }
      if (attribute.includes('ice') || attribute.includes('snow')) {
        return ['Blue', 'White'];
      }
      if (attribute.includes('lightning') || attribute.includes('thunder')) {
        return ['Yellow', 'Blue'];
      }
      if (attribute.includes('dark') || attribute.includes('shadow')) {
        return ['Black', 'Purple'];
      }
    }
    
    // Fallback : si on ne peut pas déterminer, retourner la couleur principale
    if (leader.color && typeof leader.color === 'string') {
      return [leader.color];
    }
    
    // Dernier fallback : toutes les couleurs
    return ['Red', 'Blue', 'Green', 'Purple', 'Black', 'Yellow'];
  }

  // NOUVELLE FONCTION: Vérifier si une carte peut être jouée avec un leader
  const canPlayCardWithLeader = (card: DeckCard, leader: DeckCard): boolean => {
    if (card.type === 'LEADER') return true; // Les leaders peuvent toujours être ajoutés
    
    const leaderColors = getLeaderColors(leader);
    const cardColor = card.color;
    
    console.log('🔍 canPlayCardWithLeader - Carte:', card.name, 'Couleur:', cardColor);
    console.log('🔍 Leader couleurs:', leaderColors);
    
    // Si la carte est multicolore (contient "/")
    if (cardColor.includes('/')) {
      const cardColors = cardColor.split('/').map(c => c.trim());
      console.log('🎨 Carte multicolore détectée:', cardColors);
      // Normaliser les couleurs de la carte et vérifier la compatibilité
      const normalizedCardColors = cardColors.map(color => {
        const colorMap: { [key: string]: string } = {
          'Rouge': 'Red', 'Bleu': 'Blue', 'Vert': 'Green', 
          'Violet': 'Purple', 'Noir': 'Black', 'Jaune': 'Yellow'
        };
        return colorMap[color] || color;
      });
      console.log('🎨 Couleurs de la carte normalisées:', normalizedCardColors);
      // La carte peut être jouée si le leader a au moins une des couleurs de la carte
      const canPlay = normalizedCardColors.some(color => leaderColors.includes(color));
      console.log('✅ Carte multicolore peut être jouée:', canPlay);
      return canPlay;
    }
    
    // Si la carte est mono-couleur - normaliser la couleur
    const colorMap: { [key: string]: string } = {
      'Rouge': 'Red', 'Bleu': 'Blue', 'Vert': 'Green', 
      'Violet': 'Purple', 'Noir': 'Black', 'Jaune': 'Yellow'
    };
    const normalizedCardColor = colorMap[cardColor] || cardColor;
    const canPlay = leaderColors.includes(normalizedCardColor);
    console.log('✅ Carte mono-couleur normalisée:', normalizedCardColor, 'peut être jouée:', canPlay);
    return canPlay;
  }

  const removeCardFromDeck = (cardId: string) => {
    const card = selectedCards.find(c => c.id === cardId);
    if (!card) return;

    const wasLeader = card.type === 'LEADER';
    const wasLastLeader = wasLeader && selectedCards.filter(c => c.type === 'LEADER').length === 1;

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

    // Si on a retiré le dernier leader, valider le deck (toutes les cartes deviennent valides)
    if (wasLastLeader) {
      setTimeout(() => {
        console.log('🔍 Dernier leader retiré, toutes les cartes deviennent valides');
        // Pas besoin de nettoyer, toutes les cartes sont maintenant valides
      }, 100);
    }
  };

  const availableSetOptions = useMemo(() => {
    const deriveSet = (c: DeckCard) => {
      if (c.set && typeof c.set === 'string' && c.set.trim().length > 0) return c.set.trim()
      if (c.setCode && typeof c.setCode === 'string' && c.setCode.trim().length > 0) return c.setCode.trim()
      if (c.code && typeof c.code === 'string' && c.code.includes('-')) return c.code.split('-')[0]
      return 'Autres'
    }
    const setLabels = new Set<string>()
    for (const c of availableCards) {
      setLabels.add(deriveSet(c))
    }
    return Array.from(setLabels).filter(Boolean).sort((a, b) => a.localeCompare(b))
  }, [availableCards])

  const filteredCards = useMemo(() => {
    const list = availableCards.filter(card => {
      if (filters.search && !card.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }
      if (filters.type !== 'all' && card.type !== filters.type) return false
      if (filters.color !== 'all' && card.color !== filters.color) return false
      if (filters.rarity !== 'all' && card.rarity !== filters.rarity) return false
      if (filters.set !== 'all') {
        const label = (card.set && card.set.trim()) || (card.setCode && card.setCode.trim()) || (card.code && card.code.split('-')[0]) || 'Autres'
        if (label !== filters.set) return false
      }
      if (filters.favoritesOnly && !card.isFavorite) return false
      if (filters.onlyOwned && (card.quantity || 0) <= 0) return false
      
      // NOUVELLE RÈGLE: Filtrer les cartes selon les couleurs du leader
      if (card.type !== 'LEADER') {
        const leaderCards = selectedCards.filter(c => c.type === 'LEADER')
        if (leaderCards.length > 0) {
          const leader = leaderCards[0]
          if (!canPlayCardWithLeader(card, leader)) {
            return false // Carte non autorisée
          }
        }
      }
      
      return true
    })
    if (filters.leadersFirst) {
      list.sort((a, b) => (a.type === 'LEADER' ? -1 : 0) - (b.type === 'LEADER' ? -1 : 0))
    }
    return list
  }, [availableCards, filters, selectedCards])

  // Calculer les cartes à afficher pour la page courante
  const { indexOfFirstCard, indexOfLastCard, currentCards, totalPages } = useMemo(() => {
    const last = currentPage * cardsPerPage
    const first = last - cardsPerPage
    return {
      indexOfFirstCard: first,
      indexOfLastCard: last,
      currentCards: filteredCards.slice(first, last),
      totalPages: Math.ceil(filteredCards.length / cardsPerPage),
    }
  }, [filteredCards, currentPage, cardsPerPage])

  // Fonction pour changer de page
  const paginate = useCallback((pageNumber: number) => {
    startTransition(() => setCurrentPage(pageNumber))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [startTransition])

  const saveDeck = async () => {
    try {
      // Vérifier les règles du deck avant de sauvegarder
      const leaderCards = selectedCards.filter(card => card.type === 'LEADER');
      const nonLeaderCards = selectedCards.filter(card => card.type !== 'LEADER');
      
      // Calculer le nombre total de cartes en tenant compte de la quantité
      const leaderCount = leaderCards.reduce((sum, card) => sum + (card.quantity || 1), 0);
      const nonLeaderCount = nonLeaderCards.reduce((sum, card) => sum + (card.quantity || 1), 0);
      
      console.log('Validation du deck:', {
        leaderCards: leaderCards.map(card => ({ name: card.name, quantity: card.quantity, color: card.color })),
        nonLeaderCards: nonLeaderCards.map(card => ({ name: card.name, quantity: card.quantity, color: card.color })),
        leaderCount,
        nonLeaderCount,
        totalCards: leaderCount + nonLeaderCount
      });

      // RÈGLE 1: Leader obligatoire
      if (leaderCount !== 1) {
        alert(`Le deck doit contenir exactement 1 leader (actuellement: ${leaderCount})`);
        return;
      }
      
      // RÈGLE 2: 50 cartes non-leader exactement
      if (nonLeaderCount !== 50) {
        alert(`Le deck doit contenir exactement 50 cartes non-leader (actuellement: ${nonLeaderCount})`);
        return;
      }

      // RÈGLE 3: Validation des couleurs selon le leader
      const leader = leaderCards[0];
      const leaderColors = getLeaderColors(leader);
      const invalidCards = nonLeaderCards.filter(card => !canPlayCardWithLeader(card, leader));
      
      if (invalidCards.length > 0) {
        const invalidCardNames = invalidCards.map(card => `${card.name} (${card.color})`).join(', ');
        alert(`Les cartes suivantes ne peuvent pas être jouées avec votre leader (${leaderColors.join('/')}): ${invalidCardNames}`);
        return;
      }

      // RÈGLE 4: Vérification des copies (déjà fait dans addCardToDeck, mais double vérification)
      const cardCounts = new Map<string, number>();
      for (const card of selectedCards) {
        const key = card.id;
        const currentCount = cardCounts.get(key) || 0;
        cardCounts.set(key, currentCount + (card.quantity || 1));
      }
      
      const overLimitCards = Array.from(cardCounts.entries())
        .filter(([id, count]) => count > 4)
        .map(([id]) => {
          const card = selectedCards.find(c => c.id === id);
          return card?.name || id;
        });
      
      if (overLimitCards.length > 0) {
        alert(`Les cartes suivantes dépassent la limite de 4 copies: ${overLimitCards.join(', ')}`);
        return;
      }

      const url = isEditing ? `/api/decks/${deckId}` : '/api/decks';
      const method = isEditing ? 'PUT' : 'POST';
      
      // Préparer les données dans le bon format
      const deckData = {
        name: deckName,
        cards: selectedCards.map(card => ({
          id: card.id,
          type: card.type,
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

  const deleteDeck = async () => {
    if (!isEditing || !deckId) return
    const ok = window.confirm('Supprimer ce deck ?')
    if (!ok) return
    try {
      const res = await fetch(`/api/decks/${deckId}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({} as { error?: string }))
        throw new Error(data.error || 'Suppression impossible')
      }
      router.push('/decks?deleted=1')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur lors de la suppression')
    }
  }

  const handleCardClick = (card: DeckCard) => {
    if (isMobile) {
      addCardToDeck(card)
      return
    }
    setSelectedCard(card)
    setIsModalOpen(true)
  }

  const handleAddCard = (card: DeckCard) => {
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
    <div className="p-4 md:p-8">
      <div className="container mx-auto">
        {/* En-tête avec effet de haki */}
        <div className="mb-12 relative">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative">
            <h1 className="text-4xl md:text-5xl font-bold text-white relative z-10">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400">
                {isEditing ? 'Modifier le Deck' : 'Créateur de Deck'}
              </span>
            </h1>
            <div className="flex gap-3">
              {isEditing && (
                <Button
                  onClick={deleteDeck}
                  className="relative bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl transition-all duration-300 hover:scale-105"
                  title="Supprimer ce deck"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              )}
              <Link href="/decks">
                <Button className="relative group overflow-hidden bg-gradient-to-r from-yellow-600 to-red-600 hover:from-yellow-500 hover:to-red-500 text-white px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,165,0,0.3)] transform">
                  <div className="absolute inset-0 bg-[url('/images/deck/explosion.png')] bg-cover opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                  <span className="relative z-10">Retour aux Decks</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
          {/* Section des cartes disponibles */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="rounded-lg p-4 md:p-6 bg-[#0B1120]/70 border border-white/10">
              <h2 className="text-xl md:text-2xl font-semibold mb-4 text-white">Cartes Disponibles</h2>

              {/* Bandeau aide mobile: choisir un leader */}
              {selectedCards.filter(c => c.type === 'LEADER').reduce((s,c)=>s+(c.quantity||1),0) === 0 && (
                <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-blue-200">
                  Commence par choisir un Leader. Astuce: sur mobile, un tap ajoute directement la carte au deck.
                  Attention, les couleurs sont affichées en anglais.
                  <br />
                  pour une meilleure expérience, choisissez de jouer sur un grand écran.
                </div>
              )}
              
              {/* NOUVEAU: Message informatif sur la compatibilité des couleurs */}
              {selectedCards.filter(c => c.type === 'LEADER').length > 0 && (
                <div className="mb-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-200">
                  <p className="font-medium mb-1">🎨 Filtrage automatique des couleurs</p>
                  <p>Seules les cartes compatibles avec votre leader sont affichées. Changez de leader pour voir d&apos;autres couleurs.</p>
                </div>
              )}
              
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
                <Select
                  value={filters.set}
                  onValueChange={(value) => {
                    setFilters(prev => ({ ...prev, set: value }))
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                    <SelectValue placeholder="Set" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 max-h-80">
                    <SelectItem value="all" className="text-white hover:bg-gray-700">Tous les sets</SelectItem>
                    {availableSetOptions.map((s) => (
                      <SelectItem key={s} value={s} className="text-white hover:bg-gray-700">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.onlyOwned}
                      onChange={(e) => setFilters({ ...filters, onlyOwned: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700/50 text-red-500 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-300">Seulement cartes disponibles</span>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.leadersFirst}
                      onChange={(e) => setFilters({ ...filters, leadersFirst: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700/50 text-red-500 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-300">Leaders en premier</span>
                  </label>
                </div>
              </div>

              {/* Grille de cartes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
                {currentCards.map((card) => (
                  <UICard
                    key={card.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 bg-gray-700/50 border-gray-600 overflow-hidden"
                    tabIndex={0}
                    aria-label={`Voir la carte ${card.name}`}
                    onClick={() => handleCardClick(card)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleCardClick(card)
                      }
                    }}
                  >
                    <div className="relative aspect-[3/4]">
                      <Image
                        src={card.imageUrl}
                        alt={card.name}
                        fill
                        className="object-cover rounded-t-lg"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        loading="lazy"
                      />
                      {isMobile && (
                        <button
                          type="button"
                          aria-label="Ajouter au deck"
                          className="absolute top-2 right-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-2 py-1 rounded"
                          onClick={(e) => { e.stopPropagation(); addCardToDeck(card) }}
                        >
                          +
                        </button>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <h3 className="font-semibold text-xs md:text-sm truncate text-white">{card.name}</h3>
                        <div className="flex justify-between text-xs text-gray-300">
                          <span>{card.type}</span>
                          <span>{card.cost} ⭐</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-gray-300">Disponible: {card.quantity || 0}</span>
                          {card.isFavorite && (
                            <span className="text-yellow-400 text-xs">★</span>
                          )}
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
            <div className="rounded-lg p-4 md:p-6 sticky top-24 bg-[#0B1120]/70 border border-white/10">
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
                  
                  {/* NOUVEAU: Indicateur des couleurs autorisées */}
                  {selectedCards.filter(card => card.type === 'LEADER').length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <p className="font-medium text-blue-300 mb-2">Couleurs autorisées:</p>
                      <div className="flex flex-wrap gap-2">
                        {getLeaderColors(selectedCards.find(card => card.type === 'LEADER')!).map(color => (
                          <span
                            key={color}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              color === 'Red' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                              color === 'Blue' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                              color === 'Green' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                              color === 'Purple' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                              color === 'Black' ? 'bg-gray-700/50 text-gray-300 border border-gray-600/50' :
                              color === 'Yellow' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                              'bg-gray-600/50 text-gray-300 border border-gray-500/50'
                            }`}
                          >
                            {color}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
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

      {/* Barre d’action sticky (mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
        <div className="mx-4 mb-4 rounded-2xl bg-black/60 border border-white/10 p-3 shadow-2xl">
          <div className="flex items-center justify-between text-white text-sm">
            <div className="flex flex-col">
              <span>Leader: <span className="font-bold">{selectedCards.filter(c=>c.type==='LEADER').reduce((s,c)=>s+(c.quantity||1),0)}/1</span></span>
              <span>Cartes: <span className="font-bold">{selectedCards.filter(c=>c.type!=='LEADER').reduce((s,c)=>s+(c.quantity||1),0)}/50</span></span>
            </div>
            <Button
              onClick={saveDeck}
              className="bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white font-bold px-4 py-2 rounded-xl disabled:opacity-60"
              disabled={!(selectedCards.filter(c=>c.type==='LEADER').reduce((s,c)=>s+(c.quantity||1),0)===1 && selectedCards.filter(c=>c.type!=='LEADER').reduce((s,c)=>s+(c.quantity||1),0)===50)}
            >
              Sauvegarder
            </Button>
          </div>
        </div>
      </div>

      {/* Modal with glass effect */}
      <CardModal
        card={selectedCard}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddToDeck={handleAddCard}
      />
    </div>
  )
} 