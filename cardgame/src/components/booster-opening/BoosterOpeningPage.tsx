'use client'

import { useState, useEffect, useMemo, useCallback, useTransition } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast, Toaster } from 'sonner'
import { Package, Sparkles, X, Search } from 'lucide-react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import CardReveal from './CardReveal'
import CardDetailsModal from './CardDetailsModal'
import NextImage from 'next/image'

type ApiSet = { id?: string; code?: string; name?: string }
type ApiCardMinimal = { id: string; rarity: string; name?: unknown }

import { useCollection } from '@/hooks/useCollection'
import { useBooster } from '@/hooks/useBooster'
import { ExtendedCardType } from '@/types/card'
import BoosterPackAnimation from './BoosterPackAnimation'

import { useRef } from 'react'

// LoadingSpinner retiré (non utilisé)

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
  const [selectedCard, setSelectedCard] = useState<ExtendedCardType | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  // Animations de rareté désactivées
  const [isNewCard, setIsNewCard] = useState(false)
  const [lastClickTime, setLastClickTime] = useState(0)
  const [showAnimation, setShowAnimation] = useState(false)
  const [showBoosterModal, setShowBoosterModal] = useState(false)
  const [, startTransition] = useTransition()
  const [setFilter, setSetFilter] = useState<'ALL' | 'OP' | 'EB' | 'PRB'>('ALL')
  const [query, setQuery] = useState('')
  // Direction de navigation pour l'animation de pile
  const [navDirection, setNavDirection] = useState<'prev' | 'next'>('next')
  // Animations de rareté supprimées (plus de test)
  // Audio supprimé pour simplifier et améliorer les performances
  // Stage (coffre/pack) & FX
  const [stage, setStage] = useState<'chest' | 'pack'>('chest')
  const [stageFx, setStageFx] = useState<{opening:boolean}>({ opening: false })
  
  // OPTIMISATIONS PERFORMANCE AVANCÉES
  const [performanceMode, setPerformanceMode] = useState(false)
  const [consecutiveOpenings, setConsecutiveOpenings] = useState(0)
  const [isLowEndDevice, setIsLowEndDevice] = useState(false)
  const lastOpeningTimeRef = useRef(0)
  const performanceCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Détection d'appareil bas de gamme
  useEffect(() => {
    const detectLowEndDevice = () => {
      const isMobile = window.innerWidth < 768
      // @ts-expect-error - deviceMemory n'est pas dans les types TypeScript mais existe dans certains navigateurs
      const hasLowMemory = navigator.deviceMemory && navigator.deviceMemory < 4
      const hasSlowCPU = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4
      const isOldDevice = /Android [1-6]|iPhone OS [1-9]/.test(navigator.userAgent)
      
      const shouldUseLowEndMode = isMobile && (hasLowMemory || hasSlowCPU || isOldDevice)
      setIsLowEndDevice(shouldUseLowEndMode)
      
      if (shouldUseLowEndMode) {
        setPerformanceMode(true)
      }
    }
    
    // Délai pour éviter les problèmes de rendu initial
    const timer = setTimeout(detectLowEndDevice, 100)
    
    return () => clearTimeout(timer)
  }, [])
  
  // Réduire le nombre de particules en mode performance
  const particleKeys = useMemo(() => {
    if (isLowEndDevice) return [] // Pas de particules sur appareils bas de gamme
    const baseCount = performanceMode ? 4 : 12
    return Array.from({ length: baseCount }, (_, i) => `gp-${i}`)
  }, [performanceMode, isLowEndDevice])

  // Valeurs de transition sécurisées - Animations naturelles et fluides
  const getTransitionValues = useCallback(() => {
    return {
      type: 'spring' as const, // Toujours spring pour plus de naturel
      duration: performanceMode ? 0.7 : 0.9, // Plus doux
      stiffness: performanceMode ? 100 : 150, // Plus naturel
      damping: performanceMode ? 20 : 25 // Plus d'amortissement
    }
  }, [performanceMode])
  
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

  // Couleurs par rareté pour l'indicateur de progression
  const rarityColorMap: Record<string, string> = {
    'C': 'bg-white/20',
    'UC': 'bg-green-400',
    'U': 'bg-green-400',
    'R': 'bg-blue-400',
    'SR': 'bg-purple-500',
    'L': 'bg-rose-500',
    'SEC': 'bg-amber-400',
    'SP CARD': 'bg-emerald-400',
    'TR': 'bg-cyan-400',
    'P': 'bg-pink-400'
  }

  // Valeur mémoïsée pour le set sélectionné
  const selectedSetData = useMemo(() => {
    return sets.find(set => set.id === selectedSet) ?? null
  }, [sets, selectedSet])

  // Sets affichés dans la modale (filtre + recherche)
  const displayedSets = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (sets || [])
      .filter((s) => {
        if (!s?.code) return false
        const code = s.code.replace(/[-\s]/g, '').toUpperCase()
        if (setFilter !== 'ALL' && !code.startsWith(setFilter)) return false
        if (!q) return true
        return (
          (s.name || '').toLowerCase().includes(q) ||
          code.toLowerCase().includes(q)
        )
      })
  }, [sets, setFilter, query])

  // Handlers mémoïsés
  const handleSelectSet = useCallback((id: string) => {
    setSelectedSet(id)
    setShowBoosterModal(false)
  }, [])

  // Hooks personnalisés
  const { userCollection, loadUserCollection } = useCollection()
  const { 
    addToCollection, 
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
      // Optimisation: réduire les logs en mode performance
      if (!performanceMode) {
        console.log('Détection appareil:', {
          width: window.innerWidth,
          isMobile: isMobileDevice,
          userAgent: navigator.userAgent
        });
      }
      setIsMobile(isMobileDevice);
    }
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    }
  }, [performanceMode]);

  // Chargement des sets disponibles
  useEffect(() => {
    fetch('/api/sets')
      .then(res => res.json())
      .then(data => {
        // Optimisation: réduire les logs en mode performance
        if (!performanceMode) {
          console.log('Sets chargés:', data.sets)
        }
        
        // Filtrer les sets pour n'afficher que ceux dont le code commence par "OP", "EB" ou "PRB"
        const filteredSets = (data.sets ?? []).filter((set: ApiSet) => {
          const code = set?.code
          if (!code) return false
          const normalizedCode = code.replace(/[-\s]/g, '')
          return normalizedCode.startsWith('OP') || normalizedCode.startsWith('EB') || normalizedCode.startsWith('PRB')
        })
        
        // Éliminer les doublons en utilisant le code du set comme identifiant unique
        const uniqueSets = filteredSets.reduce((acc: ApiSet[], current: ApiSet) => {
          const code = current?.code
          if (!code) return acc
          const normalizedCode = code.replace(/[-\s]/g, '')
          const exists = acc.some(item => item?.code?.replace(/[-\s]/g, '') === normalizedCode)
          if (!exists) acc.push({ ...current, code: normalizedCode })
          return acc
        }, [])
        
        // Trier les sets par code
        uniqueSets.sort((a: { code: string }, b: { code: string }) => {
          const codeA = a.code?.replace(/[-\s]/g, '') ?? '';
          const codeB = b.code?.replace(/[-\s]/g, '') ?? '';
          return codeA.localeCompare(codeB);
        });
        
        // Optimisation: réduire les logs en mode performance
        if (!performanceMode) {
          console.log('Sets filtrés (avec doublons):', filteredSets);
          console.log('Sets uniques (sans doublons):', uniqueSets);
          console.log('Nombre total de sets uniques:', uniqueSets.length);
          console.log('Codes des sets uniques:', uniqueSets.map((set: ApiSet) => set.code));
        }
        
        setSets(uniqueSets);
      })
      .catch(error => console.error('Erreur lors du chargement des sets:', error))
  }, [performanceMode])

  // Basculer la scène (coffre ↔ pack) selon set
  useEffect(() => {
    setStage(selectedSet ? 'pack' : 'chest')
  }, [selectedSet])

  // OPTIMISATIONS PERFORMANCE - Détection automatique du mode performance
  const [manualPerformanceMode, setManualPerformanceMode] = useState(false)
  
  useEffect(() => {
    const checkPerformanceMode = () => {
      const now = Date.now()
      const timeSinceLastOpening = now - lastOpeningTimeRef.current
      
      // Si plusieurs ouvertures rapides (< 2 secondes), activer le mode performance
      if (timeSinceLastOpening < 2000) {
        setConsecutiveOpenings(prev => prev + 1)
        if (consecutiveOpenings >= 1) { // Réduit de 2 à 1
          setPerformanceMode(true)
        }
      } else {
        // Reset après 5 secondes sans ouverture (réduit de 10 à 5)
        setConsecutiveOpenings(0)
        // Ne désactiver que si ce n'est pas un appareil bas de gamme ET pas activé manuellement
        if (!isLowEndDevice && !manualPerformanceMode) {
          setPerformanceMode(false)
        }
      }
      
      lastOpeningTimeRef.current = now
    }

    // Vérifier les performances toutes les 3 secondes (réduit de 5 à 3)
    performanceCheckIntervalRef.current = setInterval(checkPerformanceMode, 3000)

    return () => {
      if (performanceCheckIntervalRef.current) {
        clearInterval(performanceCheckIntervalRef.current)
      }
    }
  }, [consecutiveOpenings, isLowEndDevice, manualPerformanceMode])

  // Détection automatique des préférences de réduction de mouvement
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion || isLowEndDevice) {
      setPerformanceMode(true)
      // Ne pas marquer comme manuel si c'est automatique
    }
  }, [isLowEndDevice])

  // Nettoyage des ressources pour éviter les fuites mémoire
  useEffect(() => {
    return () => {
      // Nettoyer les timers et intervalles
      if (performanceCheckIntervalRef.current) {
        clearInterval(performanceCheckIntervalRef.current)
      }
      
      // Restaurer le scroll si le composant est démonté pendant un swipe
      if (isDragging && isMobile) {
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      }
      
      // Forcer le garbage collection si possible
      if (window.gc) {
        window.gc()
      }
    }
  }, [isDragging, isMobile])

  // Navigation entre les cartes (mémoïsé avant usage)
  const navigateCard = useCallback((direction: 'prev' | 'next') => {
    // Optimisation: réduire les logs en mode performance
    if (!performanceMode) {
      console.log('Tentative de navigation:', {
        direction,
        currentIndex: currentCardIndex,
        booster: booster ? booster.length : 'undefined',
        isMobile,
        isDragging,
        carteActuelle: booster?.[currentCardIndex]?.name
      });
    }

    if (!booster) return;
    if (booster.length === 0) return;
    if (currentCardIndex === undefined || currentCardIndex === null) return;
    
    if (direction === 'prev' && currentCardIndex > 0) {
      setNavDirection('prev')
      const prevCard = booster[currentCardIndex - 1];
      if (!prevCard) return;
      setCurrentCardIndex(currentCardIndex - 1);
      setIsNewCard(!userCollection.has(prevCard.id));
    } else if (direction === 'next' && currentCardIndex < booster.length - 1) {
      setNavDirection('next')
      const nextCard = booster[currentCardIndex + 1];
      if (!nextCard) return;
      setCurrentCardIndex(currentCardIndex + 1);
      setIsNewCard(!userCollection.has(nextCard.id));
      if (currentCardIndex + 1 === booster.length - 1) {
        const delay = isMobile ? (performanceMode ? 800 : 1200) : (performanceMode ? 1000 : 1500); // Délais rallongés
        setTimeout(async () => {
          try {
            if (!booster || booster.length === 0) return;
            const cardIds = booster.map(card => card.id);
            const result = await addToCollection(cardIds);
            if (result.success) {
              toast.success('Cartes ajoutées à votre collection !', { duration: isMobile ? 3000 : 4000, position: isMobile ? 'bottom-center' : 'top-center' });
              await loadUserCollection();
            }
          } catch (error) {
            console.error('Erreur lors de l\'ajout automatique à la collection:', error);
            toast.error('Erreur lors de l\'ajout à la collection');
          }
        }, delay);
      }
    }
  }, [currentCardIndex, booster, userCollection, isMobile, isDragging, addToCollection, loadUserCollection, performanceMode])

  // Gestionnaire des touches du clavier
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isMobile) return;
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
  }, [currentCardIndex, booster.length, isMobile, navigateCard]);

  // Chargement de la collection de l'utilisateur
  useEffect(() => {
    if (session) {
      loadUserCollection()
    }
  }, [session, loadUserCollection])

  // Vérification de la rareté supprimée (plus d'animations de test)

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
  

  // Gestion des erreurs d'image (placeholder)
  // const handleImageError = useCallback((cardId: string) => {
  //   console.error('Erreur de chargement de l\'image pour la carte:', cardId)
  // }, [])



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
    
    // Restaurer le scroll après le swipe sur mobile
    if (isMobile) {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    
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
    
    // Empêcher le scroll pendant le swipe sur mobile
    if (isMobile) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    }
  }
  
  const handleDrag = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (!info) return;
    
    // Annuler le swipe si le mouvement vertical est plus important que l'horizontal
    const verticalMovement = Math.abs(info.offset.y);
    const horizontalMovement = Math.abs(info.offset.x);
    
    if (verticalMovement > horizontalMovement && verticalMovement > 50) {
      // C'est un scroll vertical, annuler le swipe
      setIsDragging(false);
      if (isMobile) {
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      }
      return;
    }
    
    console.log('Glissement en cours:', {
      offsetX: info.offset.x,
      offsetY: info.offset.y,
      isMobile,
      currentIndex: currentCardIndex
    });
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

  // Gestion de l'ouverture du booster
  const handleOpenBooster = useCallback(async () => {
    if (!selectedSet) {
      toast.error('Veuillez sélectionner un set')
      return
    }

    // OPTIMISATION: Réduire drastiquement les délais
    const animationDelay = performanceMode ? 50 : (isLowEndDevice ? 25 : 200)
    const shouldShowStageFx = !performanceMode && !isLowEndDevice

    // Lancer la requête API IMMÉDIATEMENT
    setIsLoading(true)
    
    // Petite anim d'ouverture (FX) avant l'anim principale
    if (shouldShowStageFx) {
      setStageFx({ opening: true })
      setTimeout(() => {
        setStageFx({ opening: false })
        if (!showAnimation) {
          startTransition(() => setShowAnimation(true))
        }
      }, animationDelay)
    } else {
      // En mode performance, passer directement à l'animation
      if (!showAnimation) {
        startTransition(() => setShowAnimation(true))
      }
    }
    try {
      if (!selectedSetData) {
        throw new Error('Set non trouvé')
      }

      console.log('Début de l\'ouverture du booster:', {
        setCode: selectedSetData.code,
        isMobile,
        performanceMode
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

          // Stocker les cartes mais ne pas les afficher tout de suite (transition non bloquante)
          startTransition(() => {
            setBooster(processedCards)
            if (processedCards.length > 0) {
              setIsNewCard(!userCollection.has(processedCards[0].id))
            }
          })
          
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
  }, [selectedSet, selectedSetData, showAnimation, isMobile, userCollection, startTransition])

  const handleAnimationComplete = useCallback(async () => {
    startTransition(() => setShowAnimation(false))
    // Une fois l'animation terminée, on peut afficher les cartes
    if (booster.length > 0) {
      startTransition(() => {
        setCurrentCardIndex(0)
      })
    }
  }, [booster.length, startTransition])

  // Réinitialiser l'état et ouvrir un nouveau booster
  const resetAndOpenNewBooster = useCallback(async () => {
    // Réinitialiser l'état
    startTransition(() => {
      setBooster([])
      setCurrentCardIndex(-1)
      // plus de suivi d'animation de rareté
      setIsNewCard(false)
    })
    
    // Ouvrir directement un nouveau booster
    await handleOpenBooster()
  }, [handleOpenBooster, startTransition])

  const handleCardClick = (card: ExtendedCardType) => {
    const currentTime = new Date().getTime()
    const timeDiff = currentTime - lastClickTime
    
    if (timeDiff < 300) { // Double-clic détecté (moins de 300ms entre les clics)
      setSelectedCard(card)
    }
    
    setLastClickTime(currentTime)
  }

  return (
    <div className={`min-h-screen relative w-full bottom-12 ${performanceMode ? 'performance-mode' : ''} ${isLowEndDevice ? 'low-end-device' : ''}`}>
      {/* Fond grille bleue + veines dorées + watermarks */}
    
     
      {/* Contenu principal */}
      <div className="relative z-10 min-h-screen pt-16 w-full">
        <Toaster position="top-center" />
        
        {/* Animations existantes */}
        {showAnimation && (
          <BoosterPackAnimation 
            onComplete={handleAnimationComplete} 
            setCode={sets.find(set => set.id === selectedSet)?.code || ''}
            performanceMode={performanceMode}
          />
        )}


        
        {/* En-tête avec effet de verre dépoli */}
        <div className="w-[95%] md:w-[90%] mx-auto p-2 sm:p-4 md:p-6">
          <div className="flex justify-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: performanceMode ? 0.8 : 1.2, 
              ease: 'easeOut' 
            }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-center title-halo mx-auto w-fit"
          >
            <span className="shimmer-gold drop-shadow-glow">Ouverture de Booster</span>
          </motion.h1>
          </div>

          {/* Scène centrale: coffre/pack + infos du set */}
          <div className="stage mb-6 sm:mb-8">
            <div aria-hidden className="stage-glow" />
            
            {/* Indicateur de mode performance */}
            {performanceMode && (
              <div className="absolute top-2 right-2 z-10 bg-amber-500/90 text-black text-xs px-2 py-1 rounded-full font-medium">
                {isLowEndDevice ? "Mode Éco" : "Mode Performance"}
              </div>
            )}
       
            <motion.div
              className="relative stage-item"
              initial={false}
              animate={{ 
                scale: stageFx.opening ? (performanceMode ? 1.01 : (isLowEndDevice ? 1.005 : 1.06)) : 1, 
                rotate: stageFx.opening ? (performanceMode ? -0.5 : (isLowEndDevice ? -0.2 : -2)) : 0 
              }}
              transition={{ 
                type: 'spring' as const, // Toujours spring pour plus de naturel
                stiffness: performanceMode ? 120 : (isLowEndDevice ? 80 : 200), 
                damping: performanceMode ? 20 : (isLowEndDevice ? 15 : 18),
                duration: performanceMode ? 0.5 : (isLowEndDevice ? 0.4 : 0.6)
              }}
            >
              <NextImage
                src={stage === 'pack' ? `/images/booster/${(selectedSetData?.code || '').toLowerCase()}.png` : '/images/boostercartoon.png'}
                alt="Trésor"
                width={220}
                height={300}
                className="w-[140px] sm:w-[180px] md:w-[220px] h-auto object-contain"
                priority={false}
              />
              {/* Effet de déchirure du pack */}
              {stage === 'pack' && stageFx.opening && (
                <>
                  <div className="tear-left" />
                  <div className="tear-right" />
                </>
              )}
              {/* Particules dorées lors de l'ouverture */}
              {stageFx.opening && !performanceMode && !isLowEndDevice && (
                particleKeys.map((k, i) => (
                  <div
                    key={k}
                    className="gold-particle"
                    style={{ left: `${35 + (i%10)*3}%`, animationDelay: `${i*0.035}s` }}
                  />
                ))
              )}
              {stageFx.opening && !performanceMode && !isLowEndDevice && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, .9, 0] }}
                  transition={{ duration: .6 }}
                  style={{
                    background: 'radial-gradient(220px 120px at 50% 60%, rgba(255,215,0,.55), transparent 70%)'
                  }}
                />
              )}
            </motion.div>
          </div>

          {selectedSet && (
            <div className="mx-auto max-w-xl bg-white/5 rounded-xl p-4 sm:p-6 border border-white/10 mb-6">
              <h2 className="text-center text-xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent mb-2">
                {selectedSetData?.name}
              </h2>
              {setRules?.boosterRules && (
                <div className="grid grid-cols-2 gap-4 text-sm text-white/85">
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>{setRules.boosterRules.commonCount} Communes</div>
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>{setRules.boosterRules.uncommonCount} Peu communes</div>
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>{setRules.boosterRules.rareCount} Rares</div>
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>{setRules.boosterRules.superRareCount} Super Rare</div>
                </div>
              )}
            </div>
          )}

          {/* Boutons d'action (desktop/tablette) */}
          <div className="hidden md:flex flex-row justify-center items-center gap-4 mb-8">
            <Button 
              onClick={() => setShowBoosterModal(true)}
              aria-label="Choisir un booster"
              className="w-full sm:w-auto btn-crystal hover:brightness-110 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105"
            >
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                <span>Choisir un booster</span>
              </div>
            </Button>

            {/* Bouton mode performance */}
            <Button
              onClick={() => {
                const newMode = !performanceMode
                setPerformanceMode(newMode)
                setManualPerformanceMode(newMode) // Marquer comme activé manuellement
              }}
              aria-label={performanceMode ? "Désactiver le mode performance" : "Activer le mode performance"}
              className={`w-auto px-4 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                performanceMode 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{performanceMode ? "⚡" : "🌿"}</span>
                <span className="text-sm font-medium">{performanceMode ? "Normal" : "Éco"}</span>
              </div>
            </Button>

            {booster.length === 0 ? (
              <Button 
                onClick={handleOpenBooster}
                aria-label="Ouvrir le booster"
                disabled={!selectedSet || isLoading}
                className="w-full sm:w-auto btn-gold btn-gold-glow hover:brightness-110 text-black font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin"></div>
                    <span>Chargement...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    <span>Ouvrir le booster</span>
                  </div>
                )}
              </Button>
            ) : (
              <Button 
                onClick={resetAndOpenNewBooster}
                aria-label="Ouvrir un nouveau booster"
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
                    <span>Nouveau booster</span>
                  </div>
                )}
              </Button>
            )}
          </div>

          {/* Barre d'action mobile fixée en bas */}
          <div className="md:hidden fixed bottom-4 inset-x-4 z-40">
            <div className="rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 p-3 flex gap-3 shadow-2xl pb-[env(safe-area-inset-bottom)]">
              <Button 
                onClick={() => setShowBoosterModal(true)}
                aria-label="Choisir un booster"
                className="flex-1 btn-crystal hover:brightness-110 text-white font-bold py-3 px-4 rounded-xl transition-all"
              >
                Choisir
              </Button>

              {/* Bouton mode performance mobile */}
              <Button
                onClick={() => {
                  const newMode = !performanceMode
                  setPerformanceMode(newMode)
                  setManualPerformanceMode(newMode) // Marquer comme activé manuellement
                }}
                aria-label={performanceMode ? "Désactiver le mode performance" : "Activer le mode performance"}
                className={`px-3 py-3 rounded-xl transition-all ${
                  performanceMode 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                <span className="text-lg">{performanceMode ? "⚡" : "🌿"}</span>
              </Button>

              {booster.length === 0 ? (
                <Button
                  onClick={handleOpenBooster}
                  aria-label="Ouvrir le booster"
                  disabled={!selectedSet || isLoading}
                  className="flex-1 btn-gold btn-gold-glow hover:brightness-110 text-black font-bold py-3 px-4 rounded-xl transition-all"
                >
                  {isLoading ? '...' : 'Ouvrir'}
                </Button>
              ) : (
                <Button
                  onClick={resetAndOpenNewBooster}
                  aria-label="Ouvrir un nouveau booster"
                  disabled={!selectedSet || isLoading}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all"
                >
                  {isLoading ? '...' : 'Nouveau'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Indicateur de progression 12/12 collant */}
        {booster.length > 0 && (
          <div className="sticky top-16 z-30 w-[95%] md:w-[90%] mx-auto mb-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl px-3 py-2 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/80 text-sm font-medium">Progression</span>
                <span className="text-white text-sm font-bold">{Math.max(0, currentCardIndex + 1)} / {booster.length}</span>
              </div>
              <div className="grid grid-cols-12 gap-1">
                {Array.from({ length: 12 }).map((_, i) => {
                  const card = booster[i]
                  const isRevealed = i <= currentCardIndex
                  const rarity = card?.rarity ?? 'C'
                  const colorClass = isRevealed ? (rarityColorMap[rarity] || 'bg-white/40') : 'bg-white/10'
                  return (
                    <div key={`seg-${i}`} className="h-2 rounded-sm overflow-hidden">
                      <div className={`h-full w-full rounded-sm ${colorClass}`} />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Zone d'affichage des cartes */}
        {booster.length > 0 && currentCardIndex >= 0 && (
          <div className="w-[96%] sm:max-w-6xl mx-auto px-2 sm:px-4 pb-28 md:pb-0">
            <div className="relative rounded-2xl p-3 sm:p-6 border border-white/10 shadow-xl">
              {/* Carte actuelle avec transition type pile */}
              <div className={`relative flex items-center justify-center min-h-[360px] sm:min-h-[420px] md:min-h-[500px] swipe-container ${isDragging ? 'swiping' : ''}`}>
                <AnimatePresence initial={false} custom={navDirection}>
                  <motion.div
                    key={booster[currentCardIndex]?.id ?? `idx-${currentCardIndex}`}
                    custom={navDirection}
                    variants={{
                      enter: (dir: 'prev' | 'next') => ({
                        x: dir === 'next' ? (performanceMode ? 100 : 160) : (performanceMode ? -100 : -160),
                        y: performanceMode ? 15 : 30,
                        rotate: dir === 'next' ? (performanceMode ? -8 : -12) : (performanceMode ? 8 : 12),
                        opacity: 0
                      }),
                      center: {
                        x: 0,
                        y: 0,
                        rotate: 0,
                        opacity: 1,
                        transition: { 
                          type: 'spring' as const, // Toujours spring pour plus de naturel
                          stiffness: performanceMode ? 200 : 300, 
                          damping: performanceMode ? 22 : 30,
                          duration: performanceMode ? 0.5 : 0.7
                        }
                      },
                      exit: (dir: 'prev' | 'next') => ({
                        x: dir === 'next' ? (performanceMode ? -100 : -160) : (performanceMode ? 100 : 160),
                        y: performanceMode ? -15 : -30,
                        rotate: dir === 'next' ? (performanceMode ? 8 : 12) : (performanceMode ? -8 : -12),
                        opacity: 0,
                        transition: { duration: performanceMode ? 0.4 : 0.5, ease: 'easeInOut' }
                      })
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="will-change-transform"
                  >
                    <CardReveal
                      card={booster[currentCardIndex]}
                      isNewCard={isNewCard}
                      position={currentCardIndex + 1}
                      isMobile={isMobile}
                      onComplete={() => {}}
                      onCardClick={handleCardClick}
                      onDragStart={handleDragStart}
                      onDrag={handleDrag}
                      onDragEnd={(e, info) => {
                        handleDragEnd(e, info)
                        // Forcer la face avant juste après navigation
                        // (CardReveal écoute card.id et relance le flip)
                      }}
                    />
                  </motion.div>
                </AnimatePresence>
                <div aria-hidden className="pointer-events-none absolute inset-x-1/3 top-8 h-6 rounded-xl bg-black/30 blur-xl" />
              </div>

              {/* Zones de tap latérales (mobile) - réduites pour éviter les conflits */}
              {isMobile && (
                <>
                  <button
                    onClick={() => currentCardIndex > 0 && handleArrowClick('prev')}
                    aria-label="Carte précédente"
                    className="md:hidden absolute left-0 top-1/4 h-1/2 w-8 bg-gradient-to-r from-black/10 to-transparent"
                  />
                  <button
                    onClick={() => currentCardIndex < booster.length - 1 && handleArrowClick('next')}
                    aria-label="Carte suivante"
                    className="md:hidden absolute right-0 top-1/4 h-1/2 w-8 bg-gradient-to-l from-black/10 to-transparent"
                  />
                </>
              )}
                {/* Navigation: grandes cibles tactiles sur mobile */}
          <div className="flex justify-between items-center mb-6">
                {currentCardIndex > 0 && (
                  <button
                    onClick={() => handleArrowClick('prev')}
                    aria-label="Carte précédente"
                    className="bg-white/10 hover:bg-white/20 p-3 md:p-3 rounded-full transition-all duration-300 w-14 h-14 md:w-auto md:h-auto flex items-center justify-center"
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
                    aria-label="Carte suivante"
                    className="bg-white/10 hover:bg-white/20 p-3 md:p-3 rounded-full transition-all duration-300 w-14 h-14 md:w-auto md:h-auto flex items-center justify-center"
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
              className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="choose-treasure-title"
              onClick={() => setShowBoosterModal(false)}
            >
              {/* Backdrop */}
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
              {/* Éléments décoratifs d'arrière-plan dans le thème */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none z-[125]">
                <div className="absolute inset-0 bg-gradient-to-b from-[#0b1020]/60 to-[#0b0f1a]/60" />
                <NextImage src="/images/jolly-roger.png" alt="" width={140} height={140} className="absolute -top-4 -left-2 w-28 h-28 opacity-10" />
                <NextImage src="/globe.svg" alt="" width={140} height={140} className="absolute -bottom-6 -right-2 w-28 h-28 opacity-10" />
              </div>

              <motion.div
                initial={{ scale: performanceMode ? 0.95 : 0.9, opacity: 0, y: performanceMode ? 10 : 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: performanceMode ? 0.95 : 0.9, opacity: 0, y: performanceMode ? 10 : 20 }}
                transition={getTransitionValues()}
                className="relative z-[130] bg-white/5 backdrop-blur-xl rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.45)] w-[95%] sm:max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-white/10"
                onClick={e => e.stopPropagation()}
              >
                {/* En-tête + barre d’outils */}
                <div className="relative p-4 sm:p-6 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 sm:gap-4">
                        <motion.div
                          animate={{ 
                            y: performanceMode ? [-2, 2, -2] : [-4, 4, -4],
                            rotate: performanceMode ? [-1, 1, -1] : [-2, 2, -2]
                          }}
                          transition={{
                            duration: performanceMode ? 3 : 4,
                            repeat: Infinity,
                            ease: 'easeInOut'
                          }}
                        >
                          <NextImage 
                            src="/images/booster-ouvert.png" 
                            alt="Trésor" 
                            width={48}
                            height={48}
                            className="w-8 h-8 sm:w-12 sm:h-12"
                          />
                        </motion.div>
                        <h2 id="choose-treasure-title" className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
                          Choisissez votre Trésor
                        </h2>
                      </div>
                      <button
                        onClick={() => setShowBoosterModal(false)}
                        aria-label="Fermer la modale"
                        className="p-1 sm:p-2 hover:bg-white/10 rounded-full transition-all duration-300 hover:rotate-90 hover:scale-110"
                      >
                        <X className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />
                      </button>
                    </div>
                    {/* Outils: filtres + recherche */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch">
                      <div className="inline-flex rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                        {(['ALL','OP','EB','PRB'] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setSetFilter(tab)}
                            className={`px-3 py-2 text-sm font-medium transition-colors ${setFilter===tab? 'bg-yellow-500/20 text-yellow-300':'text-white/80 hover:text-white hover:bg-white/10'}`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                        <input
                          value={query}
                          onChange={(e)=>setQuery(e.target.value)}
                          placeholder="Rechercher un set (nom ou code)"
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/50 outline-none focus:ring-2 focus:ring-yellow-500/30"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grille des boosters */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
                  <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8">
                    {displayedSets.map((set) => (
                      <motion.div
                        key={set.id}
                        className={`relative cursor-pointer group perspective-1000 ${
                          selectedSet === set.id ? 'ring-4 ring-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.3)]' : ''
                        }`}
                        onClick={() => handleSelectSet(set.id)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleSelectSet(set.id)
                          }
                        }}
                        whileHover={{ 
                          scale: performanceMode ? 1.02 : 1.05,
                          rotateY: performanceMode ? 2 : 5,
                          z: 20
                        }}
                        whileTap={{ scale: performanceMode ? 0.98 : 0.95 }}
                        transition={{
                          type: 'spring' as const, // Toujours spring pour plus de naturel
                          duration: performanceMode ? 0.4 : 0.5,
                          stiffness: performanceMode ? 120 : 200,
                          damping: performanceMode ? 18 : 22
                        }}
                      >
                        {/* Étiquette du nom */}
                        <div className="absolute -top-3 sm:-top-4 left-0 right-0 text-center z-10">
                          <span className="inline-flex items-center gap-2 text-white text-xs sm:text-sm font-bold px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg transform transition-transform group-hover:scale-110">
                            <span>{set.name}</span>
                            <span className="text-white/70">[{set.code}]</span>
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
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            loading="lazy"
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
            getRarityGlow={getRarityGlow}
            fullscreenMobile={isMobile}
          />
        )}
      </div>
    </div>
  )
} 