'use client'

import { useState, useEffect, useRef } from 'react'
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
import { motion, AnimatePresence } from 'framer-motion'
import CardReveal from './CardReveal'
import CardDetailsModal from './CardDetailsModal'

import { useAudio } from '@/hooks/useAudio'
import { useCollection } from '@/hooks/useCollection'
import { useBooster } from '@/hooks/useBooster'
import { ExtendedCardType } from '@/types/card'
import BoosterPackAnimation from './BoosterPackAnimation'
import UltraRareAnimation from './UltraRareAnimation'
import RareAnimation from './RareAnimation'
import AlternativeAnimation from './AlternativeAnimation'

export default function BoosterOpeningPage() {
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
  const [showAnimation, setShowAnimation] = useState(false)
  const [showRareAnimation, setShowRareAnimation] = useState(false)
  const [rareAnimationType, setRareAnimationType] = useState<'ultra-rare' | 'rare' | 'alternative' | null>(null)
  const [showBoosterModal, setShowBoosterModal] = useState(false)
  
  // Utilisation des hooks personnalisés
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

  // Détection de l'appareil mobile
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

  // Chargement des sets disponibles
  useEffect(() => {
    fetch('/api/sets')
      .then(res => res.json())
      .then(data => {
        console.log('Sets chargés:', data.sets)
        
        // Filtrer les sets pour n'afficher que ceux dont le code commence par "OP", "EB" ou "PRB"
        const filteredSets = data.sets ? data.sets.filter((set: any) => {
          if (!set || !set.code) return false;
          
          // Normaliser le code en supprimant les tirets et espaces
          const normalizedCode = set.code.replace(/[-\s]/g, '');
          
          // Vérifier si le code normalisé commence par OP, EB ou PRB
          return normalizedCode.startsWith('OP') || 
                 normalizedCode.startsWith('EB') || 
                 normalizedCode.startsWith('PRB');
        }) : [];
        
        // Éliminer les doublons en utilisant le code du set comme identifiant unique
        const uniqueSets = filteredSets.reduce((acc: any[], current: any) => {
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
        console.log('Codes des sets uniques:', uniqueSets.map((set: any) => set.code));
        
        setSets(uniqueSets);
      })
      .catch(error => console.error('Erreur lors du chargement des sets:', error))
  }, [])

  // Préchargement des images
  useEffect(() => {
    if (booster && booster.length > 0) {
      const preloadImages = async () => {
        const newPreloadedImages: Record<string, boolean> = {}
        
        for (const card of booster) {
          if (card && card.imageUrl) {
            try {
              const img = new Image()
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

  // Génération des particules d'arrière-plan
  useEffect(() => {
    if (booster && booster.length > 0) {
      const particles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 3 + 1
      }))
      setBackgroundParticles(particles)
      setShowBackgroundEffect(true)
    }
  }, [booster])

  // Chargement de la collection de l'utilisateur
  useEffect(() => {
    loadUserCollection()
  }, [loadUserCollection])

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
      size: Math.random() * 4 + 2,
      color: i % 2 === 0 ? '#FFD700' : '#FFA500' // Alternance entre or et orange
    }))
    setUltraRareParticles(particles)
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
    playNewCardSound()
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
  const handleDragEnd = (event: any, info: any) => {
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
  
  const handleDrag = (event: any, info: any) => {
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
  }

  const handleAnimationComplete = async () => {
    setShowAnimation(false)
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
          const processedCards = result.cards.map((card: any) => ({
            ...card,
            name: typeof card.name === 'string' ? card.name : 'Carte sans nom'
          }))
          
          console.log('Booster ouvert avec succès:', {
            nombreCartes: processedCards.length,
            cartes: processedCards.map((card: any) => ({
              nom: card.name,
              id: card.id,
              rareté: card.rarity
            }))
          });

          setBooster(processedCards)
          setNewCardsCount(result.newCardsCount)
          
          if (processedCards.length > 0) {
            setIsNewCard(!userCollection.has(processedCards[0].id))
          }
          
          setCurrentCardIndex(0)
          setIsRevealing(true)

          console.log('Première carte prête à être révélée:', {
            index: 0,
            carte: processedCards[0]?.name,
            isMobile
          });
          
          if (result.hasRareCard) {
            // Suppression du son des cartes rares
          } 
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
    // Déterminer la direction du swipe en fonction de la position actuelle
    // Si nous sommes à la première carte, nous ne pouvons aller que vers la suivante
    // Si nous sommes à la dernière carte, nous ne pouvons aller que vers la précédente
    // Sinon, nous allons vers la carte suivante par défaut
    
    if (currentCardIndex === 0) {
      // Première carte, aller à la suivante
      setCurrentCardIndex(currentCardIndex + 1)
    } else if (currentCardIndex === booster.length - 1) {
      // Dernière carte, aller à la précédente
      setCurrentCardIndex(currentCardIndex - 1)
    } else {
      // Carte du milieu, aller à la suivante
      setCurrentCardIndex(currentCardIndex + 1)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-indigo-950 text-white p-2 sm:p-4 md:p-8">
      <Toaster position="top-center" />
      
      {/* Animation d'ouverture du booster */}
      {showAnimation && (
        <BoosterPackAnimation 
          onComplete={handleAnimationComplete} 
          setCode={sets.find(set => set.id === selectedSet)?.code || ''}
        />
      )}

      {/* Animation des cartes rares */}
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
      
      {/* En-tête */}
      <div className="max-w-6xl mx-auto mb-4 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4 text-center">Ouverture de Booster</h1>
        
        {/* Affichage du booster sélectionné */}
        {selectedSet && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center gap-2 mb-6"
          >
            <div className="relative w-32 h-48 sm:w-40 sm:h-60">
              <img
                src={`/images/booster/${sets.find(set => set.id === selectedSet)?.code.toLowerCase()}.png`}
                alt={sets.find(set => set.id === selectedSet)?.name}
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-lg sm:text-xl font-semibold text-center">
              {sets.find(set => set.id === selectedSet)?.name}
            </p>
          </motion.div>
        )}
        
        <div className="flex flex-col items-center justify-center gap-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <Button 
              onClick={() => setShowBoosterModal(true)}
              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-2 px-4 sm:px-6 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Choisir un booster</span>
              </div>
            </Button>
            
            {booster.length === 0 ? (
              <Button 
                onClick={handleOpenBooster} 
                disabled={!selectedSet || isLoading}
                className="w-full sm:w-auto bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-bold py-2 px-4 sm:px-6 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-t-2 border-white rounded-full animate-spin"></div>
                    <span>Chargement...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Ouvrir un booster</span>
                  </div>
                )}
              </Button>
            ) : (
              <Button 
                onClick={resetAndOpenNewBooster} 
                disabled={!selectedSet || isLoading}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-2 px-4 sm:px-6 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-t-2 border-white rounded-full animate-spin"></div>
                    <span>Chargement...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Nouveau booster</span>
                  </div>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de sélection des boosters */}
      <AnimatePresence>
        {showBoosterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setShowBoosterModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-bold">Sélectionnez un booster</h2>
                <button
                  onClick={() => setShowBoosterModal(false)}
                  className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-10 mt-12">
                  {sets.map((set) => (
                    <motion.div
                      key={set.id}
                      className={`relative cursor-pointer group ${selectedSet === set.id ? 'ring-4 ring-yellow-500' : ''}`}
                      onClick={() => {
                        setSelectedSet(set.id)
                        setShowBoosterModal(false)
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className="absolute -top-10 left-0 right-0 text-center">
                        <span className="text-white font-bold text-sm bg-black/50 mt-4 px-2 py-1 rounded-full">
                          {set.name}
                        </span>
                      </div>
                      <img
                        src={`/images/booster/${set.code.toLowerCase()}.png`}
                        alt={set.name}
                        className="w-full h-auto rounded-lg shadow-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-center px-2">Cliquer pour sélectionner</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Zone d'affichage des cartes */}
      {booster.length > 0 && (
        <div className="max-w-6xl mx-auto">
          {/* Affichage de la carte actuelle */}
          {currentCardIndex >= 0 && currentCardIndex < booster.length && (
            <div className="relative">
              {/* Flèche gauche */}
              {currentCardIndex > 0 && (
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute left-4 top-[103%] -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full shadow-lg transition-all duration-300"
                  onClick={() => handleArrowClick('prev')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </motion.button>
              )}

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

              {/* Flèche droite */}
              {currentCardIndex < booster.length - 1 && (
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute right-4 top-[103%] -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full shadow-lg transition-all duration-300"
                  onClick={() => handleArrowClick('next')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.button>
              )}
            </div>
          )}
          
          {/* Miniatures des cartes en bas */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-12"
          >
            <h3 className="text-xl font-bold mb-4 text-center">Cartes du booster</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {booster.map((card, index) => (
                <motion.div
                  key={index}
                  className={`relative w-16 h-24 rounded-md overflow-hidden cursor-pointer ${currentCardIndex === index ? 'ring-2 ring-yellow-400' : ''}`}
                  onClick={() => setCurrentCardIndex(index)}
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.2 }}
                >
                  <img
                    src={card.imageUrl}
                    alt={typeof card.name === 'string' ? card.name : 'Carte'}
                    className="w-full h-full object-cover"
                    onError={() => handleImageError(card.id)}
                  />
                  {rareCardGlow[card.id] && (
                    <div className="absolute inset-0 bg-yellow-500/30"></div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
      
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
  )
} 