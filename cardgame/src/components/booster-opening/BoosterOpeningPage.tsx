'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card as CardType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast, Toaster } from 'sonner'
import { Package, Sparkles, X } from 'lucide-react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import CardReveal from './CardReveal'
import CardDetailsModal from './CardDetailsModal'
import NextImage from 'next/image'

type ApiSet = { id?: string; code?: string; name?: string }
type ApiCardMinimal = { id: string; rarity: string; name?: unknown }

import { useAudio } from '@/hooks/useAudio'
import { useCollection } from '@/hooks/useCollection'
import { useBooster } from '@/hooks/useBooster'
import { ExtendedCardType } from '@/types/card'
import BoosterPackAnimation from './BoosterPackAnimation'
import UltraRareAnimation from './UltraRareAnimation'
import RareAnimation from './RareAnimation'
import AlternativeAnimation from './AlternativeAnimation'

// Modification du composant LoadingSpinner pour le rendre plus thématique
function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen pt-16">
      {/* Logo One Piece */}
      <div className="relative z-10 flex flex-col items-center">
        <NextImage 
          src="/images/jolly-roger.png" 
          alt="Loading" 
          width={128}
          height={128}
          className="w-32 h-32 animate-float opacity-90 mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
        />
        <div className="text-2xl font-bold text-yellow-400 mb-4 animate-pulse tracking-wider">
          Chargement du Trésor
        </div>
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-yellow-400 animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function BoosterOpeningPage() {
  // Hooks de base
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // États
  const [sets, setSets] = useState<Array<{id: string, code: string, name: string}>>([])
  const [selectedSet, setSelectedSet] = useState<string>('')
  const [booster, setBooster] = useState<ExtendedCardType[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(-1)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [isAddingToCollection, setIsAddingToCollection] = useState<boolean>(false)
  const [showPackOpening, setShowPackOpening] = useState<boolean>(false)
  const [preloadedImages, setPreloadedImages] = useState<Record<string, boolean>>({})
  const [selectedCard, setSelectedCard] = useState<ExtendedCardType | null>(null)
  const [isRevealing, setIsRevealing] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showCardDetails, setShowCardDetails] = useState(false)
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showRareEffect, setShowRareEffect] = useState(false)
  const [showAltArtEffect, setShowAltArtEffect] = useState(false)
  const [showUltraRareEffect, setShowUltraRareEffect] = useState(false)
  const [currentRareCard, setCurrentRareCard] = useState<ExtendedCardType | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [isNewCard, setIsNewCard] = useState(false)
  const [newCardsCount, setNewCardsCount] = useState<number>(0)
  const [backgroundParticles, setBackgroundParticles] = useState<Array<{id: number, x: number, y: number, size: number}>>([])
  const [showBackgroundEffect, setShowBackgroundEffect] = useState(false)
  const [rareCardGlow, setRareCardGlow] = useState<Record<string, boolean>>({})
  const [ultraRareParticles, setUltraRareParticles] = useState<Array<{id: number, x: number, y: number, size: number, color: string}>>([])
  const [lastClickTime, setLastClickTime] = useState(0)
  const [showAnimation, setShowAnimation] = useState(false)
  const [showRareAnimation, setShowRareAnimation] = useState(false)
  const [rareAnimationType, setRareAnimationType] = useState<'ultra-rare' | 'rare' | 'alternative' | null>(null)
  const [showBoosterModal, setShowBoosterModal] = useState(false)
  interface SetRules {
    name: string
    rarityCounts: Record<string, number>
    boosterRules?: {
      commonCount: number
      uncommonCount: number
      rareCount: number
      superRareCount: number
      leaderCount: number
      characterCount: number
      eventCount: number
      stageCount: number
      donCount: number
      altArtChance: number
      parallelChance: number
      specialChance: number
    }
  }
  const [setRules, setSetRules] = useState<SetRules | null>(null)

  // Hooks personnalisés
  const { userCollection, loadUserCollection } = useCollection()
  const { 
    playRareCardSound, 
    playAltArtSound, 
    playUltraRareSound, 
    playNewCardSound 
  } = useAudio()
  const { 
    openBooster, 
    addToCollection, 
    isUltraRareCard, 
    getRarityColor, 
    getRarityGlow 
  } = useBooster()

  // Effets
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768;
      console.log('Détection appareil:', {
        width: window.innerWidth,
        isMobile: isMobileDevice,
        userAgent: navigator.userAgent
      });
      setIsMobile(isMobileDevice);
    }
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    }
  }, []);

  // Chargement des sets disponibles
  useEffect(() => {
    fetch('/api/sets')
      .then(res => res.json())
      .then(data => {
        console.log('Sets chargés:', data.sets)
        
        // Filtrer les sets pour n'afficher que ceux dont le code commence par "OP", "EB" ou "PRB"
        const filteredSets = data.sets ? data.sets.filter((set: ApiSet) => {
          if (!set || !set.code) return false;
          
          // Normaliser le code en supprimant les tirets et espaces
          const normalizedCode = set.code.replace(/[-\s]/g, '');
          
          // Vérifier si le code normalisé commence par OP, EB ou PRB
          return normalizedCode.startsWith('OP') || 
                 normalizedCode.startsWith('EB') || 
                 normalizedCode.startsWith('PRB');
        }) : [];
        
        // Éliminer les doublons en utilisant le code du set comme identifiant unique
        const uniqueSets = filteredSets.reduce((acc: ApiSet[], current: ApiSet) => {
          if (!current || !current.code) return acc;
          
          // Normaliser le code (supprimer les tirets et espaces)
          const normalizedCode = current.code.replace(/[-\s]/g, '');
          
          // Vérifier si un set avec ce code normalisé existe déjà
          const exists = acc.some(item => item && item.code && item.code.replace(/[-\s]/g, '') === normalizedCode);
          
          // Si ce n'est pas un doublon, l'ajouter à l'accumulateur
          if (!exists) {
            // Créer une copie du set avec le code normalisé
            acc.push({
              ...current,
              code: normalizedCode // Utiliser le code normalisé pour la comparaison
            });
          }
          
          return acc;
        }, []);
        
        // Trier les sets par code
        uniqueSets.sort((a: { code: string }, b: { code: string }) => {
          const codeA = a.code.replace(/[-\s]/g, '');
          const codeB = b.code.replace(/[-\s]/g, '');
          return codeA.localeCompare(codeB);
        });
        
        console.log('Sets filtrés (avec doublons):', filteredSets);
        console.log('Sets uniques (sans doublons):', uniqueSets);
        console.log('Nombre total de sets uniques:', uniqueSets.length);
        console.log('Codes des sets uniques:', uniqueSets.map((set: ApiSet) => set.code));
        
        setSets(uniqueSets);
      })
      .catch(error => console.error('Erreur lors du chargement des sets:', error))
  }, [])

  // Gestionnaire des touches du clavier
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isMobile) {
        console.log('Touche pressée sur mobile, navigation désactivée');
        return;
      }
      
      if (event.key === 'ArrowLeft' && currentCardIndex > 0) {
        navigateCard('prev');
      } else if (event.key === 'ArrowRight' && currentCardIndex < booster.length - 1) {
        navigateCard('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentCardIndex, booster.length, isMobile]);

  // Préchargement des images
  useEffect(() => {
    if (booster && booster.length > 0) {
      const preloadImages = async () => {
        const newPreloadedImages: Record<string, boolean> = {}
        
        for (const card of booster) {
          if (card && card.imageUrl) {
            try {
              const img = new window.Image()
              img.src = card.imageUrl
              await new Promise((resolve, reject) => {
                img.onload = resolve
                img.onerror = reject
              })
              newPreloadedImages[card.id] = true
            } catch (error) {
              console.error(`Erreur de préchargement pour ${card.name}:`, error)
              handleImageError(card.id)
            }
          }
        }
        
        setPreloadedImages(newPreloadedImages)
      }
      
      preloadImages()
    }
  }, [booster])

  // Chargement de la collection de l'utilisateur
  useEffect(() => {
    if (session) {
      loadUserCollection()
    }
  }, [session, loadUserCollection])

  // Chargement des règles du set
  useEffect(() => {
    if (selectedSet && session) {
      const selectedSetData = sets.find(set => set.id === selectedSet);
      if (selectedSetData) {
        console.log('Chargement des règles pour le set:', selectedSetData.code);
        fetch(`/api/sets/${selectedSetData.code}/rules`)
          .then(res => {
            if (!res.ok) {
              throw new Error(`Erreur HTTP: ${res.status}`);
            }
            return res.json();
          })
          .then(data => {
            if (data.success) {
              console.log('Règles du set chargées:', data.rules);
              setSetRules(data.rules);
            } else {
              console.error('Erreur dans la réponse:', data.error);
            }
          })
          .catch(error => {
            console.error('Erreur lors du chargement des règles du set:', error);
            setSetRules({
              name: selectedSetData.name,
              rarityCounts: {
                'C': 45,
                'UC': 30,
                'R': 32,
                'SR': 21,
                'L': 12,
                'SEC': 4,
                'SP CARD': 6,
                'TR': 0,
                'P': 0
              },
              boosterRules: {
                commonCount: 6,
                uncommonCount: 3,
                rareCount: 2,
                superRareCount: 1,
                leaderCount: 0,
                characterCount: 4,
                eventCount: 2,
                stageCount: 0,
                donCount: 1,
                altArtChance: 0.1,
                parallelChance: 0.05,
                specialChance: 0.05
              }
            });
          });
      }
    }
  }, [selectedSet, sets, session]);

  // Si la session est en cours de chargement ou si l'utilisateur n'est pas authentifié
  if (status === 'loading' || !session) {
    return <LoadingSpinner />
  }

  // Gestion des erreurs d'image
  const handleImageError = (cardId: string) => {
    console.error('Erreur de chargement de l\'image pour la carte:', cardId)
    setImageErrors(prev => ({ ...prev, [cardId]: true }))
  }

  // Activation de l'effet de brillance pour les cartes rares
  const activateRareCardGlow = (cardId: string) => {
    setRareCardGlow(prev => ({ ...prev, [cardId]: true }))
    setTimeout(() => {
      setRareCardGlow(prev => ({ ...prev, [cardId]: false }))
    }, 3000)
  }

  // Génération des particules pour les cartes ultra rares
  const generateUltraRareParticles = () => {
    const particles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 3 + 1,
      color: `hsl(${Math.random() * 60 + 30}, 100%, 50%)`
    }))
    return particles
  }

  // Vérification de la rareté et lecture des effets
  const checkRarityAndPlayEffect = (card: ExtendedCardType) => {
    console.log('Vérification de la rareté pour:', card.name, card.rarity, card.id)
    
    // Catégorie 3 : Ultra Rare / Collector (priorité la plus haute)
    if ((card.rarity === 'SR' && card.id.endsWith('_p1'))) {
      console.log('Carte SR Alternative détectée comme Ultra Rare:', card.name)
      setCurrentRareCard(card)
      setRareAnimationType('ultra-rare')
      setShowRareAnimation(true)
      return
    }
    
    if (card.id.match(/_p[3-9]/) || 
        ['SEC', 'SP CARD', 'TR', 'P'].includes(card.rarity)) {
      console.log('Carte Ultra Rare détectée:', card.name)
      setCurrentRareCard(card)
      setRareAnimationType('ultra-rare')
      setShowRareAnimation(true)
      return
    }

    // Catégorie 1 : Alternative Art de base
    if (card.id.endsWith('_p1')) {
      console.log('Carte Alternative détectée:', card.name)
      setCurrentRareCard(card)
      setRareAnimationType('alternative')
      setShowRareAnimation(true)
      return
    }

    // Catégorie 2 : Rare + Alternatives modérées
    if (card.id.endsWith('_p2') || 
        (card.rarity === 'SR' && !card.id.endsWith('_p1') && !card.id.match(/_p[3-9]/))) {
      console.log('Carte Rare détectée:', card.name)
      setCurrentRareCard(card)
      setRareAnimationType('rare')
      setShowRareAnimation(true)
      return
    }

    // Cartes communes
    console.log('Carte commune détectée:', card.name)
  }

  const handleRareAnimationComplete = () => {
    setShowRareAnimation(false)
    setRareAnimationType(null)
  }

  // Navigation entre les cartes
  const navigateCard = (direction: 'prev' | 'next') => {
    console.log('Tentative de navigation:', {
      direction,
      currentIndex: currentCardIndex,
      booster: booster ? booster.length : 'undefined',
      isMobile,
      isDragging,
      carteActuelle: booster?.[currentCardIndex]?.name
    });

    if (!booster) {
      console.log('Navigation impossible: booster est undefined');
      return;
    }

    if (booster.length === 0) {
      console.log('Navigation impossible: booster est vide');
      return;
    }

    if (currentCardIndex === undefined || currentCardIndex === null) {
      console.log('Navigation impossible: currentCardIndex est undefined');
      return;
    }
    
    if (direction === 'prev' && currentCardIndex > 0) {
      const prevCard = booster[currentCardIndex - 1];
      if (!prevCard) {
        console.log('Navigation impossible: prevCard est undefined');
        return;
      }
      setCurrentCardIndex(currentCardIndex - 1);
      setIsNewCard(!userCollection.has(prevCard.id));

      console.log('Navigation vers la carte précédente:', {
        nouvelIndex: currentCardIndex - 1,
        carte: prevCard.name,
        isMobile
      });
    } else if (direction === 'next' && currentCardIndex < booster.length - 1) {
      const nextCard = booster[currentCardIndex + 1];
      if (!nextCard) {
        console.log('Navigation impossible: nextCard est undefined');
        return;
      }
      setCurrentCardIndex(currentCardIndex + 1);
      setIsNewCard(!userCollection.has(nextCard.id));
      
      console.log('Navigation vers la carte suivante:', {
        nouvelIndex: currentCardIndex + 1,
        carte: nextCard.name,
        isMobile
      });

      // Vérifier si la nouvelle carte est rare ou alternative
      checkRarityAndPlayEffect(nextCard);
      
      // Si on arrive à la dernière carte, ajouter automatiquement à la collection
      if (currentCardIndex + 1 === booster.length - 1) {
        console.log('Dernière carte atteinte, tentative d\'ajout automatique:', {
          isMobile,
          currentIndex: currentCardIndex,
          boosterLength: booster.length,
          isDragging,
          dernièreCarte: booster[booster.length - 1]?.name
        });
        
        // Ajouter un délai plus court sur mobile
        const delay = isMobile ? 1000 : 2000;
        
        setTimeout(async () => {
          try {
            if (!booster || booster.length === 0) {
              console.log('Ajout automatique impossible: booster est vide ou undefined');
              return;
            }

            const cardIds = booster.map(card => card.id);
            console.log('Ajout automatique des cartes:', {
              cardIds,
              isMobile,
              isDragging,
              cartes: booster.map(card => card.name)
            });
            
            const result = await addToCollection(cardIds);
            console.log('Résultat de l\'ajout automatique:', result);
            
            if (result.success) {
              toast.success('Cartes ajoutées à votre collection !', {
                duration: isMobile ? 3000 : 4000,
                position: isMobile ? 'bottom-center' : 'top-center',
                style: {
                  background: '#1a1a1a',
                  color: '#fff',
                  border: '1px solid #333',
                  fontSize: isMobile ? '14px' : '16px',
                  padding: isMobile ? '12px 16px' : '16px 24px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }
              });
              await loadUserCollection();
            }
          } catch (error) {
            console.error('Erreur lors de l\'ajout automatique à la collection:', error);
            toast.error('Erreur lors de l\'ajout à la collection', {
              duration: isMobile ? 3000 : 4000,
              position: isMobile ? 'bottom-center' : 'top-center',
              style: {
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid #333',
                fontSize: isMobile ? '14px' : '16px',
                padding: isMobile ? '12px 16px' : '16px 24px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }
            });
          }
        }, delay);
      }
    }
  }

  // Gestion du glissement des cartes
  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (!info) {
      console.log('Fin du glissement impossible: info est undefined');
      return;
    }

    setIsDragging(false);
    const threshold = 100; // Distance minimale pour déclencher le changement de carte
    
    console.log('Fin du glissement:', {
      offsetX: info.offset ? info.offset.x : 'undefined',
      threshold,
      isMobile,
      currentIndex: currentCardIndex,
      boosterLength: booster ? booster.length : 'undefined',
      carteActuelle: booster?.[currentCardIndex]?.name
    });
    
    if (!booster || booster.length === 0) {
      console.log('Fin du glissement impossible: booster est vide ou undefined');
      return;
    }

    // Vérifier si c'est un clic ou un glissement
    const isClick = Math.abs(info.offset.x) < threshold;
    
    if (isClick) {
      console.log('Clic détecté, pas de navigation');
      return;
    }

    if (info.offset.x > threshold && currentCardIndex > 0) {
      // Glissement vers la droite -> carte précédente
      console.log('Glissement vers la droite détecté');
      navigateCard('prev');
    } else if (info.offset.x < -threshold && currentCardIndex < booster.length - 1) {
      // Glissement vers la gauche -> carte suivante
      console.log('Glissement vers la gauche détecté');
      navigateCard('next');
    }
  }
  
  const handleDragStart = () => {
    console.log('Début du glissement:', {
      isMobile,
      currentIndex: currentCardIndex,
      boosterLength: booster ? booster.length : 'undefined',
      carteActuelle: booster?.[currentCardIndex]?.name
    });
    setIsDragging(true);
    setDragDirection(null);
  }
  
  const handleDrag = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (!info) return;
    
    console.log('Glissement en cours:', {
      offsetX: info.offset.x,
      isMobile,
      currentIndex: currentCardIndex
    });

    if (info.offset.x > 0) {
      setDragDirection('right');
    } else if (info.offset.x < 0) {
      setDragDirection('left');
    }
  }

  // Gestion du clic sur les flèches
  const handleArrowClick = (direction: 'prev' | 'next') => {
    console.log('Clic sur la flèche:', {
      direction,
      isMobile,
      currentIndex: currentCardIndex,
      boosterLength: booster ? booster.length : 'undefined',
      carteActuelle: booster?.[currentCardIndex]?.name
    });

    if (!booster || booster.length === 0) {
      console.log('Navigation impossible: booster est vide ou undefined');
      return;
    }

    if (direction === 'prev' && currentCardIndex > 0) {
      navigateCard('prev');
    } else if (direction === 'next' && currentCardIndex < booster.length - 1) {
      navigateCard('next');
    }
  }

  // Déclencher l'effet de confetti
  const triggerConfetti = () => {
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 3000)
  }

  // Gestion de l'ouverture du booster
  const handleOpenBooster = async () => {
    if (!selectedSet) {
      toast.error('Veuillez sélectionner un set')
      return
    }

    if (!showAnimation) {
      setShowAnimation(true)
    }

    // Lancer la requête API en même temps que l'animation
    setIsLoading(true)
    try {
      const selectedSetData = sets.find(set => set.id === selectedSet)
      if (!selectedSetData) {
        throw new Error('Set non trouvé')
      }

      console.log('Début de l\'ouverture du booster:', {
        setCode: selectedSetData.code,
        isMobile
      });

      const response = await fetch('/api/booster/open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ setCode: selectedSetData.code }),
      })
      
      if (response.ok) {
        const result = await response.json()
        
        if (result.success) {
          const processedCards = (result.cards as ApiCardMinimal[]).map((card) => ({
            ...card,
            name: typeof card.name === 'string' ? card.name : 'Carte sans nom'
          })) as unknown as ExtendedCardType[]
          
          console.log('Booster ouvert avec succès:', {
            nombreCartes: processedCards.length,
            cartes: processedCards.map((card) => ({
              nom: card.name,
              id: card.id,
              rareté: card.rarity
            }))
          });

          // Stocker les cartes mais ne pas les afficher tout de suite
          setBooster(processedCards)
          setNewCardsCount(result.newCardsCount)
          
          if (processedCards.length > 0) {
            setIsNewCard(!userCollection.has(processedCards[0].id))
          }
          
          // Supprimer la vérification de rareté ici car elle sera gérée dans les composants d'animation
        } else {
          toast.error(result.error || 'Erreur lors de l\'ouverture du booster')
        }
      } else {
        throw new Error('Erreur lors de la récupération du booster')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de l\'ouverture du booster')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnimationComplete = async () => {
    setShowAnimation(false)
    // Une fois l'animation terminée, on peut afficher les cartes
    if (booster.length > 0) {
      setCurrentCardIndex(0)
      setIsRevealing(true)
    }
  }

  // Gestion de l'ajout à la collection
  const handleAddToCollection = async () => {
    if (!booster || !booster.length) {
      console.log('Aucune carte à ajouter à la collection');
      return;
    }

    console.log('Tentative d\'ajout à la collection:', {
      isMobile,
      boosterLength: booster.length,
      cardIds: booster.map(card => card.id)
    });

    setIsAddingToCollection(true);
    try {
      const result = await addToCollection(booster.map(card => card.id));
      
      console.log('Résultat de l\'ajout à la collection:', result);
      
      if (result.success) {
        toast.success(result.message);
        // Recharger la collection après l'ajout des cartes
        await loadUserCollection();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout à la collection:', error);
      toast.error('Erreur lors de l\'ajout à la collection');
    } finally {
      setIsAddingToCollection(false);
    }
  }

  // Réinitialiser l'état et ouvrir un nouveau booster
  const resetAndOpenNewBooster = async () => {
    // Réinitialiser l'état
    setBooster([])
    setCurrentCardIndex(-1)
    setIsRevealing(false)
    setShowRareEffect(false)
    setShowAltArtEffect(false)
    setShowUltraRareEffect(false)
    setCurrentRareCard(null)
    setShowConfetti(false)
    setIsNewCard(false)
    setNewCardsCount(0)
    setShowBackgroundEffect(false)
    setRareCardGlow({})
    setUltraRareParticles([])
    setSelectedCard(null)
    setShowCardDetails(false)
    
    // Ouvrir directement un nouveau booster
    await handleOpenBooster()
  }

  const handleCardClick = (card: ExtendedCardType) => {
    const currentTime = new Date().getTime()
    const timeDiff = currentTime - lastClickTime
    
    if (timeDiff < 300) { // Double-clic détecté (moins de 300ms entre les clics)
      setSelectedCard(card)
      if (card.rarity === 'Ultra Rare') {
        setUltraRareParticles(generateUltraRareParticles())
      }
    }
    
    setLastClickTime(currentTime)
  }

  return (
    <div className="min-h-screen relative w-full">
      {/* Contenu principal */}
      <div className="relative z-10 min-h-screen pt-16 w-full">
        <Toaster position="top-center" />
        
        {/* Animations existantes */}
        {showAnimation && (
          <BoosterPackAnimation 
            onComplete={handleAnimationComplete} 
            setCode={sets.find(set => set.id === selectedSet)?.code || ''}
          />
        )}

        {showRareAnimation && currentRareCard && (
          <>
            {rareAnimationType === 'ultra-rare' && (
              <UltraRareAnimation
                card={currentRareCard}
                onComplete={handleRareAnimationComplete}
              />
            )}
            {rareAnimationType === 'rare' && (
              <RareAnimation
                card={currentRareCard}
                onComplete={handleRareAnimationComplete}
              />
            )}
            {rareAnimationType === 'alternative' && (
              <AlternativeAnimation
                card={currentRareCard}
                onComplete={handleRareAnimationComplete}
              />
            )}
          </>
        )}
        
        {/* En-tête avec effet de verre dépoli */}
        <div className="w-[95%] md:w-[90%] mx-auto p-2 sm:p-4 md:p-6">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-center"
          >
            <span className="bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 bg-clip-text text-transparent drop-shadow-glow">
              Ouverture de Trésor
            </span>
          </motion.h1>

          {/* Affichage du booster sélectionné avec effet de carte */}
          {selectedSet && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row items-center justify-center gap-4 sm:gap-8 mb-6 sm:mb-8"
            >
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                <div className="relative w-40 h-60 sm:w-48 sm:h-72 transform group-hover:scale-105 transition-all duration-300">
                  <NextImage
                    src={`/images/booster/${sets.find(set => set.id === selectedSet)?.code.toLowerCase()}.png`}
                    alt={sets.find(set => set.id === selectedSet)?.name || 'Booster'}
                    fill
                    sizes="(max-width: 640px) 10rem, 12rem"
                    className="object-contain rounded-xl shadow-2xl"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:gap-6 max-w-md">
                <div className="text-center md:text-left">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent mb-2">
                    {sets.find(set => set.id === selectedSet)?.name}
                  </h2>
                  <p className="text-white/80">
                    Découvrez les trésors cachés de ce booster !
                  </p>
                </div>

                <div className="bg-white/5 rounded-xl p-4 sm:p-6 border border-white/10">
                  <h3 className="text-lg font-bold text-white/90 mb-4">Contenu possible :</h3>
                  {setRules && setRules.boosterRules && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <span className="text-white/80">{setRules.boosterRules.commonCount} Communes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                        <span className="text-white/80">{setRules.boosterRules.uncommonCount} Peu communes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                        <span className="text-white/80">{setRules.boosterRules.rareCount} Rares</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                        <span className="text-white/80">{setRules.boosterRules.superRareCount} Super Rare</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8">
            <Button 
              onClick={() => setShowBoosterModal(true)}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105"
            >
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                <span>Choisir un booster</span>
              </div>
            </Button>

            {booster.length === 0 ? (
              <Button 
                onClick={handleOpenBooster}
                disabled={!selectedSet || isLoading}
                className="w-full sm:w-auto bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin"></div>
                    <span>Chargement...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    <span>Ouvrir le trésor</span>
                  </div>
                )}
              </Button>
            ) : (
              <Button 
                onClick={resetAndOpenNewBooster}
                disabled={!selectedSet || isLoading}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin"></div>
                    <span>Chargement...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    <span>Nouveau trésor</span>
                  </div>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Zone d'affichage des cartes */}
        {booster.length > 0 && currentCardIndex >= 0 && (
          <div className="w-[90%] sm:max-w-6xl mx-auto px-2 sm:px-4">
            <div className="relative rounded-2xl p-3 sm:p-6 border border-white/10 shadow-xl">
              {/* Carte actuelle */}
              <CardReveal
                card={booster[currentCardIndex]}
                isNewCard={isNewCard}
                onComplete={() => {
                  setIsRevealing(false)
                  checkRarityAndPlayEffect(booster[currentCardIndex])
                }}
                onCardClick={handleCardClick}
                onDragStart={handleDragStart}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
              />
                {/* Navigation */}
          <div className="flex justify-between items-center mb-6">
                {currentCardIndex > 0 && (
                  <button
                    onClick={() => handleArrowClick('prev')}
                    className="bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all duration-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}

                <div className="text-white/80 text-lg font-bold">
                  Carte {currentCardIndex + 1} sur {booster.length}
                </div>

                {currentCardIndex < booster.length - 1 && (
                  <button
                    onClick={() => handleArrowClick('next')}
                    className="bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all duration-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        

        {/* Modal de sélection des boosters */}
        <AnimatePresence>
          {showBoosterModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
              onClick={() => setShowBoosterModal(false)}
            >
              {/* Éléments décoratifs d'arrière-plan */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-950/30 to-indigo-950/30"></div>
                <NextImage 
                  src="/images/jolly-roger.png" 
                  alt=""
                  width={128}
                  height={128}
                  className="absolute top-0 left-0 w-32 h-32 opacity-20 rotate-[-15deg]"
                />
                <NextImage 
                  src="/images/straw-hat.png" 
                  alt=""
                  width={128}
                  height={128}
                  className="absolute bottom-0 right-0 w-32 h-32 opacity-20 rotate-[15deg]"
                />
              </div>

              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-gradient-to-b from-blue-950/90 via-blue-900/90 to-indigo-950/90 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.3)] w-[95%] sm:max-w-5xl max-h-[90vh] overflow-y-auto border border-yellow-500/20"
                onClick={e => e.stopPropagation()}
              >
                {/* En-tête de la modale */}
                <div className="relative p-4 sm:p-6 border-b border-yellow-500/20">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 sm:gap-4">
                      <NextImage 
                        src="/images/treasure-chest.png" 
                        alt="Trésor" 
                        width={48}
                        height={48}
                        className="w-8 h-8 sm:w-12 sm:h-12 animate-float"
                      />
                      <h2 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
                        Choisissez votre Trésor
                      </h2>
                    </div>
                    <button
                      onClick={() => setShowBoosterModal(false)}
                      className="p-1 sm:p-2 hover:bg-white/10 rounded-full transition-all duration-300 hover:rotate-90 hover:scale-110"
                    >
                      <X className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />
                    </button>
                  </div>
                </div>

                {/* Grille des boosters */}
                <div className="p-4 sm:p-6 md:p-8">
                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                    {sets.map((set) => (
                      <motion.div
                        key={set.id}
                        className={`relative cursor-pointer group perspective-1000 ${
                          selectedSet === set.id ? 'ring-4 ring-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.3)]' : ''
                        }`}
                        onClick={() => {
                          setSelectedSet(set.id)
                          setShowBoosterModal(false)
                        }}
                        whileHover={{ 
                          scale: 1.05,
                          rotateY: 5,
                          z: 20
                        }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {/* Étiquette du nom */}
                        <div className="absolute -top-3 sm:-top-4 left-0 right-0 text-center z-10">
                          <span className="inline-block text-white text-xs sm:text-sm font-bold px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg transform transition-transform group-hover:scale-110">
                            {set.name}
                          </span>
                        </div>

                        {/* Carte du booster */}
                        <div className="relative rounded-xl overflow-hidden shadow-[0_10px_20px_rgba(0,0,0,0.3)] transition-all duration-300 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                          {/* Effet de brillance */}
                          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-transparent to-blue-500/20 group-hover:from-yellow-500/30 group-hover:to-blue-500/30 transition-all duration-300" />
                          
                          {/* Effet de lueur sur les bords */}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/50 to-yellow-500/0 blur-xl"></div>
                          </div>

                          <NextImage
                            src={`/images/booster/${set.code.toLowerCase()}.png`}
                            alt={set.name}
                            width={400}
                            height={600}
                            className="w-full h-auto transform transition-all duration-500 group-hover:scale-110"
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de détails de la carte */}
        {selectedCard && (
          <CardDetailsModal
            card={selectedCard}
            onClose={() => setSelectedCard(null)}
            getRarityColor={getRarityColor}
            getRarityGlow={getRarityGlow}
          />
        )}
      </div>
    </div>
  )
} 