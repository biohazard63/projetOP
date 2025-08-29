'use client'

import { useState, useEffect, useMemo, useCallback, useTransition } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast, Toaster } from 'sonner'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import CardDetailsModal from './CardDetailsModal'
import NextImage from 'next/image'

// Composants optimisés
import BoosterHeader from './components/BoosterHeader'
import BoosterControls from './components/BoosterControls'
import MobileActionBar from './components/MobileActionBar'
import ProgressIndicator from './components/ProgressIndicator'
import CardDisplay from './components/CardDisplay'

type ApiSet = { id?: string; code?: string; name?: string }
type ApiCardMinimal = { id: string; rarity: string; name?: unknown }

import { useCollection } from '@/hooks/useCollection'
import { useBooster } from '@/hooks/useBooster'
import { ExtendedCardType } from '@/types/card'
import BoosterPackAnimation from './BoosterPackAnimation'
import RareAnimation from './RareAnimation'
import UltraRareAnimation from './UltraRareAnimation'
import AlternativeAnimation from './AlternativeAnimation'

import { useRef } from 'react'

export default function BoosterOpeningPageOptimized() {
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
  const [isNewCard, setIsNewCard] = useState(false)
  const [lastClickTime, setLastClickTime] = useState(0)
  const [showAnimation, setShowAnimation] = useState(false)
  const [showBoosterModal, setShowBoosterModal] = useState(false)
  const [, startTransition] = useTransition()
  const [setFilter, setSetFilter] = useState<'ALL' | 'OP' | 'EB' | 'PRB'>('ALL')
  const [query, setQuery] = useState('')
  const [navDirection, setNavDirection] = useState<'prev' | 'next'>('next')
  const [stage, setStage] = useState<'chest' | 'pack'>('chest')
  const [stageFx, setStageFx] = useState<{opening:boolean}>({ opening: false })
  
  // Animations de rareté
  const [showRareAnimation, setShowRareAnimation] = useState(false)
  const [showUltraRareAnimation, setShowUltraRareAnimation] = useState(false)
  const [showAlternativeAnimation, setShowAlternativeAnimation] = useState(false)
  const [rareCard, setRareCard] = useState<ExtendedCardType | null>(null)
  
  // OPTIMISATIONS PERFORMANCE AVANCÉES
  const [performanceMode, setPerformanceMode] = useState(false)
  const [consecutiveOpenings, setConsecutiveOpenings] = useState(0)
  const [isLowEndDevice, setIsLowEndDevice] = useState(false)
  const [manualPerformanceMode, setManualPerformanceMode] = useState(false)
  const lastOpeningTimeRef = useRef(0)
  const performanceCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Détection d'appareil bas de gamme - Mode normal par défaut sur mobile
  useEffect(() => {
    const detectLowEndDevice = () => {
      const isMobile = window.innerWidth < 768
      // @ts-expect-error - deviceMemory n'est pas dans les types TypeScript mais existe dans certains navigateurs
      const hasVeryLowMemory = navigator.deviceMemory && navigator.deviceMemory < 2
      const hasVerySlowCPU = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 2
      const isVeryOldDevice = /Android [1-4]|iPhone OS [1-6]/.test(navigator.userAgent)
      
      // Mode performance seulement pour les appareils vraiment très bas de gamme
      const shouldUseLowEndMode = isMobile && (hasVeryLowMemory || hasVerySlowCPU || isVeryOldDevice)
      setIsLowEndDevice(shouldUseLowEndMode)
      
      // Par défaut, mode normal sur mobile (sauf appareils très bas de gamme)
      if (shouldUseLowEndMode) {
        setPerformanceMode(true)
      } else {
        setPerformanceMode(false) // Mode normal par défaut
      }
    }
    
    const timer = setTimeout(detectLowEndDevice, 100)
    return () => clearTimeout(timer)
  }, [])
  
  // Réduire le nombre de particules en mode performance
  const particleKeys = useMemo(() => {
    if (isLowEndDevice) return []
    const baseCount = performanceMode ? 4 : (isMobile ? 8 : 12) // Plus de particules en mode normal sur mobile
    return Array.from({ length: baseCount }, (_, i) => `gp-${i}`)
  }, [performanceMode, isLowEndDevice, isMobile])

  // Valeurs de transition sécurisées - Animations naturelles et fluides
  const getTransitionValues = useCallback(() => {
    return {
      type: 'spring' as const,
      duration: performanceMode ? 0.8 : (isMobile ? 1.0 : 1.1), // Durée adaptée pour mobile
      stiffness: performanceMode ? 120 : (isMobile ? 160 : 180), // Stiffness adaptée pour mobile
      damping: performanceMode ? 25 : (isMobile ? 28 : 30) // Damping adapté pour mobile
    }
  }, [performanceMode, isMobile])
  
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
        const filteredSets = (data.sets ?? []).filter((set: ApiSet) => {
          const code = set?.code
          if (!code) return false
          const normalizedCode = code.replace(/[-\s]/g, '')
          return normalizedCode.startsWith('OP') || normalizedCode.startsWith('EB') || normalizedCode.startsWith('PRB')
        })
        
        const uniqueSets = filteredSets.reduce((acc: ApiSet[], current: ApiSet) => {
          const code = current?.code
          if (!code) return acc
          const normalizedCode = code.replace(/[-\s]/g, '')
          const exists = acc.some(item => item?.code?.replace(/[-\s]/g, '') === normalizedCode)
          if (!exists) acc.push({ ...current, code: normalizedCode })
          return acc
        }, [])
        
        uniqueSets.sort((a: { code: string }, b: { code: string }) => {
          const codeA = a.code?.replace(/[-\s]/g, '') ?? '';
          const codeB = b.code?.replace(/[-\s]/g, '') ?? '';
          return codeA.localeCompare(codeB);
        });
        
        setSets(uniqueSets);
      })
      .catch(error => console.error('Erreur lors du chargement des sets:', error))
  }, [])

  // Basculer la scène (coffre ↔ pack) selon set
  useEffect(() => {
    setStage(selectedSet ? 'pack' : 'chest')
  }, [selectedSet])

  // OPTIMISATIONS PERFORMANCE - Détection automatique du mode performance
  useEffect(() => {
    const checkPerformanceMode = () => {
      const now = Date.now()
      const timeSinceLastOpening = now - lastOpeningTimeRef.current
      
      if (timeSinceLastOpening < 2000) {
        setConsecutiveOpenings(prev => prev + 1)
        if (consecutiveOpenings >= 1) {
          setPerformanceMode(true)
        }
      } else {
        setConsecutiveOpenings(0)
        if (!isLowEndDevice && !manualPerformanceMode) {
          setPerformanceMode(false)
        }
      }
      
      lastOpeningTimeRef.current = now
    }

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
    }
  }, [isLowEndDevice])

  // Nettoyage des ressources
  useEffect(() => {
    return () => {
      if (performanceCheckIntervalRef.current) {
        clearInterval(performanceCheckIntervalRef.current)
      }
      
      if (isDragging && isMobile) {
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      }
      
      if (window.gc) {
        window.gc()
      }
    }
  }, [isDragging, isMobile])

  // Fonction pour déclencher l'animation de rareté lors de la navigation
  const triggerRarityAnimation = useCallback((card: ExtendedCardType) => {
    const rarity = card.rarity?.toUpperCase()
    
    // Délai court pour s'assurer que l'état est stable
    setTimeout(() => {
      // Détecter les cartes alternatives par leur ID (se termine par _pX)
      const isAlternativeCard = card.id && card.id.includes('_p')
      
      // Ultra-Rare : TR, SEC, SP CARD
      if (rarity === 'TR' || rarity === 'SEC' || rarity === 'SP CARD') {
        setRareCard(card)
        setShowUltraRareAnimation(true)
      } 
      // Rare : SR, L
      else if (rarity === 'SR' || rarity === 'L') {
        setRareCard(card)
        setShowRareAnimation(true)
      } 
      // Alternative : ID se termine par _pX
      else if (isAlternativeCard) {
        setRareCard(card)
        setShowAlternativeAnimation(true)
      }
    }, 100) // Délai de 100ms pour la stabilité
  }, [])

  // Navigation entre les cartes (mémoïsé)
  const navigateCard = useCallback((direction: 'prev' | 'next') => {
    if (!booster || booster.length === 0) return;
    if (currentCardIndex === undefined || currentCardIndex === null) return;
    
    if (direction === 'prev' && currentCardIndex > 0) {
      setNavDirection('prev')
      const prevCard = booster[currentCardIndex - 1];
      if (!prevCard) return;
      setCurrentCardIndex(currentCardIndex - 1);
      setIsNewCard(!userCollection.has(prevCard.id));
      
      // Déclencher l'animation de rareté si la carte est rare
      const rarity = prevCard.rarity?.toUpperCase()
      const isAlternativeCard = prevCard.id && prevCard.id.includes('_p')
      
      if (rarity === 'TR' || rarity === 'SEC' || rarity === 'SP CARD' || 
          rarity === 'SR' || rarity === 'L' || isAlternativeCard) {
        // Délai pour s'assurer que la navigation est terminée
        setTimeout(() => {
          triggerRarityAnimation(prevCard);
        }, 150)
      }
    } else if (direction === 'next' && currentCardIndex < booster.length - 1) {
      setNavDirection('next')
      const nextCard = booster[currentCardIndex + 1];
      if (!nextCard) return;
      setCurrentCardIndex(currentCardIndex + 1);
      setIsNewCard(!userCollection.has(nextCard.id));
      
      // Déclencher l'animation de rareté si la carte est rare
      const rarity = nextCard.rarity?.toUpperCase()
      const isAlternativeCard = nextCard.id && nextCard.id.includes('_p')
      
      if (rarity === 'TR' || rarity === 'SEC' || rarity === 'SP CARD' || 
          rarity === 'SR' || rarity === 'L' || isAlternativeCard) {
        // Délai pour s'assurer que la navigation est terminée
        setTimeout(() => {
          triggerRarityAnimation(nextCard);
        }, 150)
      }
      if (currentCardIndex + 1 === booster.length - 1) {
        const delay = isMobile ? (performanceMode ? 800 : 1200) : (performanceMode ? 1000 : 1500);
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
  }, [currentCardIndex, booster, userCollection, isMobile, addToCollection, loadUserCollection, performanceMode, triggerRarityAnimation])

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

  // Chargement des règles du set
  useEffect(() => {
    if (selectedSet && session) {
      const selectedSetData = sets.find(set => set.id === selectedSet);
      if (selectedSetData) {
        fetch(`/api/sets/${selectedSetData.code}/rules`)
          .then(res => {
            if (!res.ok) {
              throw new Error(`Erreur HTTP: ${res.status}`);
            }
            return res.json();
          })
          .then(data => {
            if (data.success) {
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

  // Gestion du glissement des cartes
  const handleDragEnd = useCallback((
    event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number; y: number } }
  ) => {
    if (!info) return;

    setIsDragging(false);
    
    if (isMobile) {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    
    const threshold = 100;
    
    if (!booster || booster.length === 0) return;

    const isClick = Math.abs(info.offset.x) < threshold;
    
    if (isClick) return;

    if (info.offset.x > threshold && currentCardIndex > 0) {
      navigateCard('prev');
    } else if (info.offset.x < -threshold && currentCardIndex < booster.length - 1) {
      navigateCard('next');
    }
  }, [booster, currentCardIndex, isMobile, navigateCard])
  
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    
    if (isMobile) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    }
  }, [isMobile])
  
  const handleDrag = useCallback((
    event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number; y: number } }
  ) => {
    if (!info) return;
    
    const verticalMovement = Math.abs(info.offset.y);
    const horizontalMovement = Math.abs(info.offset.x);
    
    if (verticalMovement > horizontalMovement && verticalMovement > 50) {
      setIsDragging(false);
      if (isMobile) {
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      }
      return;
    }
  }, [isMobile])

  // Gestion du clic sur les flèches
  const handleArrowClick = useCallback((direction: 'prev' | 'next') => {
    if (!booster || booster.length === 0) return;

    if (direction === 'prev' && currentCardIndex > 0) {
      navigateCard('prev');
    } else if (direction === 'next' && currentCardIndex < booster.length - 1) {
      navigateCard('next');
    }
  }, [booster, currentCardIndex, navigateCard])



  // Gestion de l'ouverture du booster
  const handleOpenBooster = useCallback(async () => {
    if (!selectedSet) {
      toast.error('Veuillez sélectionner un set')
      return
    }

    const animationDelay = performanceMode ? 50 : (isLowEndDevice ? 25 : 200)
    const shouldShowStageFx = !performanceMode && !isLowEndDevice

    setIsLoading(true)
    
    if (shouldShowStageFx) {
      setStageFx({ opening: true })
      setTimeout(() => {
        setStageFx({ opening: false })
        if (!showAnimation) {
          startTransition(() => setShowAnimation(true))
        }
      }, animationDelay)
    } else {
      if (!showAnimation) {
        startTransition(() => setShowAnimation(true))
      }
    }
    
    try {
      if (!selectedSetData) {
        throw new Error('Set non trouvé')
      }

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
          
          startTransition(() => {
            setBooster(processedCards)
            if (processedCards.length > 0) {
              setIsNewCard(!userCollection.has(processedCards[0].id))
              // Pas d'animation automatique à l'ouverture - seulement lors de la navigation
            }
          })
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
  }, [selectedSet, selectedSetData, showAnimation, isMobile, userCollection, startTransition, performanceMode, isLowEndDevice])

  const handleAnimationComplete = useCallback(async () => {
    startTransition(() => setShowAnimation(false))
    if (booster.length > 0) {
      // Délai pour s'assurer que l'animation d'ouverture est bien terminée
      setTimeout(() => {
        startTransition(() => {
          setCurrentCardIndex(0)
          // Déclencher l'animation de rareté si la première carte est rare
          const firstCard = booster[0]
          if (firstCard) {
            const rarity = firstCard.rarity?.toUpperCase()
            const isAlternativeCard = firstCard.id && firstCard.id.includes('_p')
            
            if (rarity === 'TR' || rarity === 'SEC' || rarity === 'SP CARD' || 
                rarity === 'SR' || rarity === 'L' || isAlternativeCard) {
              triggerRarityAnimation(firstCard)
            }
          }
        })
      }, 200) // Délai de 200ms pour la stabilité
    }
  }, [booster.length, startTransition, triggerRarityAnimation])

  // Vérification de la rareté et déclenchement des animations
  const checkRarityAndPlayEffect = useCallback((card: ExtendedCardType) => {
    const rarity = card.rarity?.toUpperCase()
    
    if (rarity === 'SR' || rarity === 'SEC' || rarity === 'L') {
      setRareCard(card)
      setShowUltraRareAnimation(true)
    } else if (rarity === 'R') {
      setRareCard(card)
      setShowRareAnimation(true)
    } else if (rarity === 'P' || rarity === 'TR' || rarity === 'SP CARD') {
      setRareCard(card)
      setShowAlternativeAnimation(true)
    }
  }, [])

  // Réinitialiser l'état et ouvrir un nouveau booster
  const resetAndOpenNewBooster = useCallback(async () => {
    startTransition(() => {
      setBooster([])
      setCurrentCardIndex(-1)
      setIsNewCard(false)
    })
    
    await handleOpenBooster()
  }, [handleOpenBooster, startTransition])

  const handleCardClick = useCallback((card: ExtendedCardType) => {
    const currentTime = new Date().getTime()
    const timeDiff = currentTime - lastClickTime
    
    if (timeDiff < 300) {
      setSelectedCard(card)
    }
    
    setLastClickTime(currentTime)
  }, [lastClickTime])

  // Handlers pour les composants
  const handleTogglePerformanceMode = useCallback(() => {
    const newMode = !performanceMode
    setPerformanceMode(newMode)
    setManualPerformanceMode(newMode)
  }, [performanceMode])

  const handleSelectBooster = useCallback(() => {
    setShowBoosterModal(true)
  }, [])

  return (
    <div 
      className={`min-h-screen relative w-full bottom-12 ${performanceMode ? 'performance-mode' : ''} ${isLowEndDevice ? 'low-end-device' : ''}`}
      style={{
        touchAction: 'pan-y',
        overscrollBehavior: 'auto'
      }}
      onTouchStart={(e) => {
        // Permettre le scroll vertical sur mobile
        if (isMobile) {
          const touch = e.touches[0];
          const target = e.currentTarget as HTMLElement;
          target.dataset.touchStartY = touch.clientY.toString();
        }
      }}
      onTouchMove={(e) => {
        // Permettre le scroll vertical
        if (isMobile) {
          const touch = e.touches[0];
          const target = e.currentTarget as HTMLElement;
          const startY = parseInt(target.dataset.touchStartY || '0');
          const deltaY = Math.abs(touch.clientY - startY);
          
          // Si le mouvement est principalement vertical, permettre le scroll
          if (deltaY > 10) {
            // Ne pas empêcher le scroll
          }
        }
      }}
    >
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

        {/* Animations de rareté */}
        {showRareAnimation && rareCard && (
          <RareAnimation
            card={rareCard}
            onComplete={() => {
              // Délai avant de fermer l'animation
              setTimeout(() => setShowRareAnimation(false), 1000)
            }}
            performanceMode={performanceMode}
          />
        )}

        {showUltraRareAnimation && rareCard && (
          <UltraRareAnimation
            card={rareCard}
            onComplete={() => {
              // Délai avant de fermer l'animation
              setTimeout(() => setShowUltraRareAnimation(false), 1000)
            }}
            performanceMode={performanceMode}
          />
        )}

        {showAlternativeAnimation && rareCard && (
          <AlternativeAnimation
            card={rareCard}
            onComplete={() => {
              // Délai avant de fermer l'animation
              setTimeout(() => setShowAlternativeAnimation(false), 1000)
            }}
            performanceMode={performanceMode}
          />
        )}

        {/* En-tête optimisé */}
        <BoosterHeader
          isMobile={isMobile}
          performanceMode={performanceMode}
          isLowEndDevice={isLowEndDevice}
          stage={stage}
          stageFx={stageFx}
          selectedSetData={selectedSetData}
          particleKeys={particleKeys}
        />

        {/* Informations du set */}
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

        {/* Contrôles optimisés */}
        <BoosterControls
          selectedSet={selectedSet}
          isLoading={isLoading}
          boosterLength={booster.length}
          performanceMode={performanceMode}

          onSelectBooster={handleSelectBooster}
          onTogglePerformanceMode={handleTogglePerformanceMode}
          onOpenBooster={handleOpenBooster}
          onResetAndOpenNewBooster={resetAndOpenNewBooster}
        />

        {/* Barre d'action mobile optimisée */}
        <MobileActionBar
          selectedSet={selectedSet}
          isLoading={isLoading}
          boosterLength={booster.length}
          performanceMode={performanceMode}
          onSelectBooster={handleSelectBooster}
          onTogglePerformanceMode={handleTogglePerformanceMode}
          onOpenBooster={handleOpenBooster}
          onResetAndOpenNewBooster={resetAndOpenNewBooster}
        />

        {/* Indicateur de progression optimisé */}
        <ProgressIndicator
          booster={booster}
          currentCardIndex={currentCardIndex}
        />

        {/* Affichage des cartes optimisé */}
        <CardDisplay
          booster={booster}
          currentCardIndex={currentCardIndex}
          isNewCard={isNewCard}
          isMobile={isMobile}
          isDragging={isDragging}
          performanceMode={performanceMode}
          navDirection={navDirection}
          onCardClick={handleCardClick}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          onArrowClick={handleArrowClick}
        />

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
                {/* En-tête + barre d'outils */}
                <div className="relative p-4 sm:p-6 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 sm:gap-4">
                        <motion.div
                          animate={{ 
                            y: performanceMode ? [-3, 3, -3] : [-4, 4, -4],
                            rotate: performanceMode ? [-1.5, 1.5, -1.5] : [-2, 2, -2]
                          }}
                          transition={{
                            duration: performanceMode ? 2.5 : 4,
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
                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
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
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
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
                          scale: performanceMode ? 1.03 : 1.05,
                          rotateY: performanceMode ? 3 : 5,
                          z: 20
                        }}
                        whileTap={{ scale: performanceMode ? 0.98 : 0.95 }}
                        transition={{
                          type: 'spring' as const,
                          duration: performanceMode ? 0.5 : 0.6,
                          stiffness: performanceMode ? 150 : 250,
                          damping: performanceMode ? 22 : 28
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
