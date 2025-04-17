'use client'

import { useState, useEffect, useRef, MutableRefObject } from 'react'
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
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { ChevronLeft, ChevronRight, Sparkles, Star, Zap, Package, Gift, Award, Crown, Gem } from 'lucide-react'
import confetti from 'canvas-confetti'

// Création d'un type étendu pour les cartes avec isParallel et uniqueId
type ExtendedCardType = CardType & {
  isParallel?: boolean
  uniqueId: string
  isAltArt?: boolean;
  isSpecial?: boolean;
}

interface CollectionCard {
  code: string;
  // autres propriétés si nécessaire
}

export default function BoosterOpening() {
  const [sets, setSets] = useState<string[]>([])
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
  const [currentRareCard, setCurrentRareCard] = useState<ExtendedCardType | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const altAudioRef = useRef<HTMLAudioElement | null>(null)
  const specialAudioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlayingSound, setIsPlayingSound] = useState(false)
  const soundTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [fanAngle, setFanAngle] = useState(0)
  const [showParticles, setShowParticles] = useState(false)
  const [particlePosition, setParticlePosition] = useState({ x: 0, y: 0 })
  const [isHoveringCard, setIsHoveringCard] = useState<string | null>(null)
  const [showBackgroundEffect, setShowBackgroundEffect] = useState(false)
  const [backgroundParticles, setBackgroundParticles] = useState<Array<{id: number, x: number, y: number, size: number}>>([])
  const [rareCardGlow, setRareCardGlow] = useState<Record<string, boolean>>({})
  const [desktopDragDirection, setDesktopDragDirection] = useState<'left' | 'right' | null>(null)
  const [isDesktopDragging, setIsDesktopDragging] = useState(false)
  const [desktopSelectedCard, setDesktopSelectedCard] = useState<ExtendedCardType | null>(null)
  const [showDesktopCardDetails, setShowDesktopCardDetails] = useState(false)
  const [showUltraRareEffect, setShowUltraRareEffect] = useState(false)
  const ultraRareAudioRef = useRef<HTMLAudioElement | null>(null)
  const [ultraRareParticles, setUltraRareParticles] = useState<Array<{id: number, x: number, y: number, size: number, color: string}>>([])
  const [seenCards, setSeenCards] = useState<Set<string>>(new Set())
  const [userCollection, setUserCollection] = useState<Set<string>>(new Set())
  const [newCardsCount, setNewCardsCount] = useState<number>(0)
  const newCardAudioRef = useRef<HTMLAudioElement | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [isNewCard, setIsNewCard] = useState(false)

  // Liste des cartes ultra rares
  const ULTRA_RARE_CARDS = [
    "EB01-006_p2",
    "EB01-006_p5",
    "EB01-061",
    "EB01-061_p1",
    "OP01-001_p2",
    "OP01-005_p2",
    "OP01-006_p2",
    "OP01-006_p3",
    "OP01-006_p4",
    "OP01-006_p5",
    "OP01-013_p2",
    "OP01-013_p3",
    "OP01-016_p2",
    "OP01-016_p3",
    "OP01-016_p4",
    "OP01-016_p5",
    "OP01-021_p2",
    "OP01-021_p3",
    "OP01-024_p2",
    "OP01-024_p3",
    "OP01-025_p2",
    "OP01-029_p2",
    "OP01-029_p3",
    "OP01-033_p2",
    "OP01-033_p3",
    "OP01-033_p4",
    "OP01-033_p5",
    "OP01-035_p2",
    "OP01-041_p2",
    "OP01-041_p3",
    "OP01-041_p4",
    "OP01-041_p5",
    "OP01-047_p2",
    "OP01-047_p3",
    "OP01-047_p4",
    "OP01-051_p2",
    "OP01-051_p3",
    "OP01-051_p4",
    "OP01-052_p2",
    "OP01-052_p3",
    "OP01-052_p4",
    "OP01-060_p2",
    "OP01-070_p3",
    "OP01-070_p4",
    "OP01-073_p2",
    "OP01-073_p3",
    "OP01-078_p2",
    "OP01-078_p3",
    "OP01-078_p4",
    "OP01-120",
    "OP01-120_p1",
    "OP01-120_p2",
    "OP01-120_p3",
    "OP01-120_p4",
    "OP01-120_p5",
    "OP01-121",
    "OP01-121_p1",
    "OP01-121_p2",
    "OP01-121_p3",
    "OP01-121_p4",
    "OP02-001_p2",
    "OP02-004_p2",
    "OP02-004_p3",
    "OP02-004_p4",
    "OP02-013_p2",
    "OP02-013_p3",
    "OP02-013_p4",
    "OP02-015_p2",
    "OP02-015_p3",
    "OP02-015_p4",
    "OP02-018_p2",
    "OP02-018_p3",
    "OP02-018_p4",
    "OP02-018_p5",
    "OP02-035_p2",
    "OP02-041_p2",
    "OP02-059_p2",
    "OP02-085_p2",
    "OP02-089_p2",
    "OP02-089_p3",
    "OP02-089_p4",
    "OP02-093_p2",
    "OP02-096_p2",
    "OP02-096_p3",
    "OP02-098_p2",
    "OP02-099_p2",
    "OP02-099_p3",
    "OP02-099_p4",
    "OP02-106_p2",
    "OP02-106_p3",
    "OP02-106_p4",
    "OP02-106_p5",
    "OP02-108_p2",
    "OP02-114_p2",
    "OP02-114_p3",
    "OP02-117_p3",
    "OP02-117_p4",
    "OP02-117_p5",
    "OP02-120",
    "OP02-120_p1",
    "OP02-120_p2",
    "OP02-121",
    "OP02-121_p1",
    "OP02-121_p2",
    "OP02-121_p3",
    "OP03-001_p2",
    "OP03-003_p1",
    "OP03-003_p2",
    "OP03-003_p3",
    "OP03-003_p4",
    "OP03-003_p5",
    "OP03-008_p1",
    "OP03-055_p2",
    "OP03-055_p3",
    "OP03-056_p2",
    "OP03-056_p3",
    "OP03-056_p4",
    "OP03-057_p2",
    "OP03-057_p3",
    "OP03-057_p4",
    "OP03-060_p2",
    "OP03-060_p3",
    "OP03-078_p2",
    "OP03-079_p2",
    "OP03-079_p3",
    "OP03-079_p4",
    "OP03-089_p2",
    "OP03-089_p3",
    "OP03-089_p4",
    "OP03-089_p5",
    "OP03-092_p2",
    "OP03-094_p2",
    "OP03-094_p3",
    "OP03-099_p2",
    "OP03-108_p2",
    "OP03-108_p3",
    "OP03-110_p2",
    "OP03-110_p3",
    "OP03-110_p4",
    "OP03-110_p5",
    "OP03-112_p4",
    "OP03-112_p5",
    "OP03-113_p2",
    "OP03-113_p3",
    "OP03-114_p2",
    "OP03-116_p4",
    "OP03-116_p5",
    "OP03-121_p2",
    "OP03-121_p3",
    "OP03-121_p4",
    "OP03-122",
    "OP03-122_p1",
    "OP03-122_p2",
    "OP03-122_p3",
    "OP03-123",
    "OP03-123_p1",
    "OP03-123_p3",
    "OP03-123_p4",
    "OP04-024_p2",
    "OP04-029_p2",
    "OP04-029_p3",
    "OP04-031_p2",
    "OP04-031_p3",
    "OP04-032_p2",
    "OP04-032_p3",
    "OP04-036_p2",
    "OP04-036_p3",
    "OP04-044_p2",
    "OP04-044_p3",
    "OP04-044_p4",
    "OP04-056_p2",
    "OP04-056_p3",
    "OP04-056_p4",
    "OP04-064_p2",
    "OP04-083_p2",
    "OP04-083_p3",
    "OP04-083_p4",
    "OP04-089_p2",
    "OP04-089_p3",
    "OP04-089_p4",
    "OP04-095_p2",
    "OP04-095_p3",
    "OP04-100_p2",
    "OP04-100_p3",
    "OP04-100_p4",
    "OP04-100_p5",
    "OP04-104_p2",
    "OP04-104_p3",
    "OP04-112_p2",
    "OP04-112_p3",
    "OP04-118",
    "OP04-118_p1",
    "OP04-119",
    "OP04-119_p1",
    "OP04-119_p2",
    "OP05-006_p2",
    "OP05-006_p3",
    "OP05-007_p2",
    "OP05-007_p3",
    "OP05-010_p2",
    "OP05-010_p3",
    "OP05-015_p2",
    "OP05-015_p3",
    "OP05-015_p4",
    "OP05-015_p5",
    "OP05-034_p2",
    "OP05-034_p3",
    "OP05-034_p4",
    "OP05-034_p5",
    "OP05-043_p2",
    "OP05-043_p3",
    "OP05-051_p2",
    "OP05-057_p2",
    "OP05-057_p3",
    "OP05-057_p4",
    "OP05-060_p3",
    "OP05-067_p3",
    "OP05-067_p4",
    "OP05-069_p2",
    "OP05-069_p3",
    "OP05-073_p2",
    "OP05-073_p3",
    "OP05-074_p2",
    "OP05-074_p3",
    "OP05-074_p4",
    "OP05-074_p5",
    "OP05-081_p2",
    "OP05-081_p3",
    "OP05-081_p4",
    "OP05-082_p2",
    "OP05-082_p3",
    "OP05-082_p4",
    "OP05-091_p2",
    "OP05-093_p2",
    "OP05-100_p2",
    "OP05-105_p2",
    "OP05-105_p3",
    "OP05-105_p4",
    "OP05-114_p2",
    "OP05-114_p3",
    "OP05-115_p2",
    "OP05-115_p3",
    "OP05-115_p4",
    "OP05-117_p2",
    "OP05-117_p3",
    "OP05-117_p4",
    "OP05-118",
    "OP05-118_p1",
    "OP05-118_p2",
    "OP05-118_p3",
    "OP05-119",
    "OP05-119_p1",
    "OP05-119_p2",
    "OP05-119_p3",
    "OP05-119_p4",
    "OP05-119_p5",
    "OP05-119_p6",
    "OP06-003_p2",
    "OP06-003_p3",
    "OP06-023_p2",
    "OP06-023_p3",
    "OP06-023_p4",
    "OP06-035_p2",
    "OP06-035_p3",
    "OP06-036_p2",
    "OP06-036_p3",
    "OP06-036_p4",
    "OP06-038_p2",
    "OP06-038_p3",
    "OP06-056_p2",
    "OP06-056_p3",
    "OP06-060_p2",
    "OP06-060_p3",
    "OP06-064_p2",
    "OP06-064_p3",
    "OP06-065_p2",
    "OP06-065_p3",
    "OP06-065_p4",
    "OP06-066_p2",
    "OP06-066_p3",
    "OP06-067_p2",
    "OP06-067_p3",
    "OP06-067_p4",
    "OP06-068_p2",
    "OP06-068_p3",
    "OP06-069_p3",
    "OP06-069_p4",
    "OP06-079_p2",
    "OP06-079_p3",
    "OP06-079_p4",
    "OP06-086_p2",
    "OP06-086_p3",
    "OP06-091_p2",
    "OP06-091_p3",
    "OP06-100_p2",
    "OP06-100_p3",
    "OP06-101_p2",
    "OP06-106_p2",
    "OP06-106_p3",
    "OP06-110_p2",
    "OP06-110_p3",
    "OP06-110_p4",
    "OP06-114_p2",
    "OP06-114_p3",
    "OP06-118",
    "OP06-118_p1",
    "OP06-118_p2",
    "OP06-118_p3",
    "OP06-119",
    "OP06-119_p1",
    "OP07-015_p2",
    "OP07-051_p2",
    "OP07-051_p3",
    "OP07-109_p2",
    "OP07-118",
    "OP07-118_p1",
    "OP07-119",
    "OP07-119_p1",
    "OP08-106_p2",
    "OP08-118",
    "OP08-118_p1",
    "OP08-118_p2",
    "OP08-119",
    "OP08-119_p1",
    "OP09-004_p2",
    "OP09-004_p3",
    "OP09-051_p2",
    "OP09-051_p3",
    "OP09-093_p2",
    "OP09-093_p3",
    "OP09-118",
    "OP09-118_p1",
    "OP09-118_p2",
    "OP09-119",
    "OP09-119_p1",
    "OP09-119_p2",
    "P-001_p2",
    "P-001_p3",
    "P-001_p4",
    "P-014_p2",
    "P-014_p3",
    "P-029_p2",
    "P-029_p3",
    "P-029_p4",
    "P-041_p2",
    "P-053_p2",
    "P-053_p3",
    "P-055_p2",
    "P-055_p3",
    "ST01-002_p2",
    "ST01-004_p2",
    "ST01-005_p2",
    "ST01-006_p2",
    "ST01-006_p3",
    "ST01-006_p5",
    "ST01-007_p2",
    "ST01-007_p3",
    "ST01-008_p2",
    "ST01-011_p2",
    "ST01-012_p1",
    "ST01-012_p2",
    "ST01-012_p3",
    "ST01-012_p4",
    "ST01-013_p2",
    "ST01-014_p2",
    "ST01-014_p3",
    "ST02-004_p2",
    "ST02-004_p3",
    "ST02-004_p4",
    "ST02-007_p2",
    "ST03-004_p1",
    "ST03-004_p2",
    "ST03-005_p2",
    "ST03-005_p3",
    "ST03-005_p4",
    "ST03-005_p5",
    "ST03-008_p2",
    "ST03-008_p4",
    "ST03-008_p5",
    "ST03-009_p1",
    "ST03-013_p2",
    "ST03-013_p3",
    "ST03-013_p4",
    "ST04-003_p1",
    "ST04-003_p2",
    "ST04-003_p3",
    "ST04-003_p4",
    "ST04-005_p1",
    "ST04-005_p2",
    "ST04-005_p3",
    "ST04-005_p4",
    "ST04-016_p2",
    "ST04-016_p3",
    "ST06-006_p2",
    "ST06-010_p2",
    "ST06-010_p3",
    "ST06-014_p2",
    "ST06-014_p3",
    "ST07-007_p2",
    "ST07-007_p3",
    "ST09-014_p2",
    "ST09-014_p3",
    "ST10-010_p2",
    "ST10-010_p3",
    "ST10-010_p4",
    "ST11-003_p2",
    "ST11-004_p2",
    "ST11-005_p2",
    "ST12-014_p2",
    "ST12-014_p3"
  ]

  // Fonction pour vérifier si une carte est ultra rare
  const isUltraRareCard = (card: ExtendedCardType) => {
    // Vérifier si la carte est dans la liste des ultra rares
    if (ULTRA_RARE_CARDS.includes(card.code)) return true
    
    // Vérifier si c'est une carte promotionnelle (P-001 à P-060)
    if (card.code.startsWith('P-')) return true
    
    // Vérifier si c'est une SP Card (SP-001 à SP-043)
    if (card.code.startsWith('SP-')) return true
    
    // Vérifier si c'est une carte avec _p3 ou plus
    if (card.imageUrl && /_p[2-9]/.test(card.imageUrl)) return true
    
    // Vérifier si c'est une carte SEC
    if (card.rarity === 'SEC') return true
    
    return false
  }

  useEffect(() => {
    // Détecter si l'appareil est mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  useEffect(() => {
    fetch('/api/sets')
      .then(res => res.json())
      .then(data => {
        console.log('Sets chargés:', data.sets)
        setSets(data.sets)
      })
      .catch(error => console.error('Erreur lors du chargement des sets:', error))
  }, [])

  // Préchargement des images
  useEffect(() => {
    if (booster.length > 0) {
      const preloadImages = async () => {
        const newPreloadedImages: Record<string, boolean> = {}
        
        for (const card of booster) {
          if (card.imageUrl) {
            try {
              const img = new Image()
              img.src = card.imageUrl
              await new Promise((resolve, reject) => {
                img.onload = resolve
                img.onerror = reject
              })
              newPreloadedImages[card.uniqueId] = true
            } catch (error) {
              console.error(`Erreur de préchargement pour ${card.name}:`, error)
              handleImageError(card.uniqueId)
            }
          }
        }
        
        setPreloadedImages(newPreloadedImages)
      }
      
      preloadImages()
    }
  }, [booster])

  useEffect(() => {
    // Précharger les sons
    console.log('Initialisation des sons...')
    audioRef.current = new Audio('/sounds/rare-card.mp3')
    altAudioRef.current = new Audio('/sounds/alt-art.mp3')
    specialAudioRef.current = new Audio('/sounds/special-card.mp3')
    ultraRareAudioRef.current = new Audio('/sounds/ultra-rare.mp3')
    newCardAudioRef.current = new Audio('/sounds/new-card.mp3')
    
    // Vérifier que les sons sont chargés
    if (audioRef.current) console.log('Son rare-card.mp3 chargé')
    if (altAudioRef.current) console.log('Son alt-art.mp3 chargé')
    if (specialAudioRef.current) console.log('Son special-card.mp3 chargé')
    if (ultraRareAudioRef.current) console.log('Son ultra-rare.mp3 chargé')
    if (newCardAudioRef.current) console.log('Son new-card.mp3 chargé')
    
    // Limiter la durée des sons à 4 secondes
    if (audioRef.current) audioRef.current.addEventListener('timeupdate', () => {
      if (audioRef.current && audioRef.current.currentTime > 5) {
        audioRef.current.pause()
        setIsPlayingSound(false)
      }
    })
    
    if (altAudioRef.current) altAudioRef.current.addEventListener('timeupdate', () => {
      if (altAudioRef.current && altAudioRef.current.currentTime > 4) {
        altAudioRef.current.pause()
        setIsPlayingSound(false)
      }
    })
    
    if (specialAudioRef.current) specialAudioRef.current.addEventListener('timeupdate', () => {
      if (specialAudioRef.current && specialAudioRef.current.currentTime > 4) {
        specialAudioRef.current.pause()
        setIsPlayingSound(false)
      }
    })

    if (ultraRareAudioRef.current) ultraRareAudioRef.current.addEventListener('timeupdate', () => {
      if (ultraRareAudioRef.current && ultraRareAudioRef.current.currentTime > 5) {
        ultraRareAudioRef.current.pause()
        setIsPlayingSound(false)
      }
    })
    
    return () => {
      if (audioRef.current) audioRef.current.pause()
      if (altAudioRef.current) altAudioRef.current.pause()
      if (specialAudioRef.current) specialAudioRef.current.pause()
      if (ultraRareAudioRef.current) ultraRareAudioRef.current.pause()
      if (soundTimeoutRef.current) clearTimeout(soundTimeoutRef.current)
      if (newCardAudioRef.current) newCardAudioRef.current.pause()
    }
  }, [])

  // Fonction pour jouer un son avec un délai minimum entre les sons
  const playSound = (soundType: 'ultra-rare' | 'alt-art' | 'special-card' | 'rare-card' | 'new-card') => {
    let selectedAudioRef: MutableRefObject<HTMLAudioElement | null>;
    
    switch (soundType) {
      case 'ultra-rare':
        selectedAudioRef = ultraRareAudioRef;
        break;
      case 'alt-art':
        selectedAudioRef = altAudioRef;
        break;
      case 'special-card':
      case 'rare-card':
        selectedAudioRef = specialAudioRef;
        break;
      case 'new-card':
        selectedAudioRef = newCardAudioRef;
        break;
      default:
        return;
    }

    if (selectedAudioRef.current) {
      selectedAudioRef.current.currentTime = 0;
      selectedAudioRef.current.play().catch(error => {
        console.error('Erreur lors de la lecture du son:', error);
      });
    }
  };

  const startPackOpening = async () => {
    setShowPackOpening(true)
    
    // Jouer le son rare-card.mp3 pendant l'animation
    if (specialAudioRef.current) {
      specialAudioRef.current.currentTime = 0
      specialAudioRef.current.play().catch(error => {
        console.error('Erreur lors de la lecture du son rare-card:', error)
      })
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000))
    setShowPackOpening(false)
    setCurrentCardIndex(0)
  }

  const openBooster = async () => {
    try {
      setIsLoading(true)
      setBooster([])
      setCurrentCardIndex(0)
      setNewCardsCount(0)
      setIsNewCard(false)
      
      // Récupérer d'abord les cartes du booster
      const response = await fetch('/api/booster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ set: selectedSet }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de l\'ouverture du booster')
      }

      const data = await response.json()
      const cards = data.booster
      
      // Vérifier s'il y a une carte rare dans le booster
      const hasRareCard = cards.some((card: ExtendedCardType) => 
        ['L', 'SR', 'SEC', 'SP CARD', 'Rare', 'Rare Holo'].includes(card.rarity) || 
        isUltraRareCard(card) || 
        card.imageUrl?.includes('_p1') || 
        card.isParallel
      )
      
      // Lancer l'animation du verso de la carte qui tourne
      setShowPackOpening(true)
      
      // Jouer le son approprié pendant l'animation
      if (hasRareCard && audioRef.current) {
        audioRef.current.currentTime = 0
        audioRef.current.play().catch(error => {
          console.error('Erreur lors de la lecture du son rare-card:', error)
        })
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000))
      setShowPackOpening(false)
      
      // Compter les nouvelles cartes
      const newCards = cards.filter((card: ExtendedCardType) => !userCollection.has(card.code))
      setNewCardsCount(newCards.length)
      setBooster(cards)
      
      // Initialiser isNewCard pour la première carte
      if (cards.length > 0) {
        setIsNewCard(!userCollection.has(cards[0].code))
      }
      
      setCurrentCardIndex(0)
      setIsLoading(false)
    } catch (error) {
      console.error('Erreur:', error)
      setIsLoading(false)
    }
  }

  const addToCollection = async () => {
    if (!booster || !booster.length) return

    setIsAddingToCollection(true)
    try {
      const response = await fetch('/api/collection/add-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardIds: booster.map(card => card.id)
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success(data.message)
        // Recharger la collection après l'ajout des cartes
        await loadUserCollection()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout à la collection:', error)
      toast.error('Erreur lors de l\'ajout à la collection')
    } finally {
      setIsAddingToCollection(false)
    }
  }

  const revealNextCard = () => {
    if (booster && currentCardIndex < booster.length) {
      const card = booster[currentCardIndex]
      console.log('=== Détails de la carte actuelle ===')
      console.log('Nom:', card.name)
      console.log('Code:', card.code)
      console.log('Type:', card.type)
      console.log('Rareté:', card.rarity)
      console.log('=== Collection de l\'utilisateur ===')
      console.log('Nombre de cartes dans la collection:', userCollection.size)
      console.log('Codes des cartes dans la collection:', Array.from(userCollection))
      console.log('=== Vérification de la nouvelle carte ===')
      const isNew = !userCollection.has(card.code)
      console.log('Code recherché:', card.code)
      console.log('Est-ce une nouvelle carte?', isNew)
      console.log('=== Fin des détails ===')
      
      setIsNewCard(isNew)
      
      if (isNew) {
        // Jouer le son pour les nouvelles cartes
        if (newCardAudioRef.current) {
          newCardAudioRef.current.currentTime = 0
          newCardAudioRef.current.play()
        }
        
        // Déclencher l'effet de confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        })
      }
      
      setCurrentCardIndex(prev => prev + 1)
    }
  }

  const handleImageError = (cardId: string) => {
    console.error('Erreur de chargement de l\'image pour la carte:', cardId)
    setImageErrors(prev => ({ ...prev, [cardId]: true }))
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'SEC':
        return 'from-indigo-300 via-purple-400 to-pink-500'
      case 'SR':
        return 'from-purple-400 via-pink-400 to-red-500'
      case 'R':
        return 'from-blue-400 via-indigo-400 to-purple-500'
      case 'UC':
        return 'from-emerald-400 via-teal-400 to-cyan-500'
      default:
        return 'from-gray-400 via-gray-500 to-gray-600'
    }
  }

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case 'SEC':
        return 'shadow-[0_0_30px_rgba(139,92,246,0.8)]'
      case 'SR':
        return 'shadow-[0_0_30px_rgba(236,72,153,0.8)]'
      case 'R':
        return 'shadow-[0_0_30px_rgba(99,102,241,0.8)]'
      case 'UC':
        return 'shadow-[0_0_30px_rgba(52,211,153,0.8)]'
      default:
        return 'shadow-[0_0_20px_rgba(156,163,175,0.8)]'
    }
  }

  const activateRareCardGlow = (cardId: string) => {
    setRareCardGlow(prev => ({ ...prev, [cardId]: true }))
    setTimeout(() => {
      setRareCardGlow(prev => ({ ...prev, [cardId]: false }))
    }, 3000)
  }

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

  const checkRarityAndPlayEffect = (card: ExtendedCardType) => {
    console.log('Vérification de la rareté pour:', card.name, card.rarity)
    
    if (isUltraRareCard(card)) {
      console.log('Carte ultra rare détectée:', card.name)
      setCurrentRareCard(card)
      setShowUltraRareEffect(true)
      playSound('ultra-rare')
      generateUltraRareParticles()
      setTimeout(() => {
        setShowUltraRareEffect(false)
      }, 3000)
      return
    }
    
    if (card.imageUrl?.includes('_p1') || card.isParallel) {
      console.log('Carte alternative détectée:', card.name)
      setCurrentRareCard(card)
      setShowAltArtEffect(true)
      playSound('alt-art')
      setTimeout(() => {
        setShowAltArtEffect(false)
      }, 3000)
      return
    }
    
    if (['L', 'SR', 'SEC', 'SP CARD'].includes(card.rarity)) {
      console.log('Carte spéciale détectée:', card.name);
      setCurrentRareCard(card);
      setShowRareEffect(true);
      playSound('special-card');
      setTimeout(() => {
        setShowRareEffect(false)
      }, 3000)
      return;
    }
    
    if (card.rarity === 'Rare' || card.rarity === 'Rare Holo') {
      console.log('Carte rare détectée:', card.name);
      setCurrentRareCard(card);
      setShowRareEffect(true);
      playSound('rare-card');
      setTimeout(() => {
        setShowRareEffect(false)
      }, 3000)
      return;
    }
    
    console.log('Carte commune détectée:', card.name);
    playSound('new-card');
  };

  const navigateCard = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentCardIndex > 0) {
      const prevCard = booster[currentCardIndex - 1]
      setCurrentCardIndex(currentCardIndex - 1)
      setIsNewCard(!userCollection.has(prevCard.code))
    } else if (direction === 'next' && booster && currentCardIndex < booster.length - 1) {
      const nextCard = booster[currentCardIndex + 1]
      setCurrentCardIndex(currentCardIndex + 1)
      setIsNewCard(!userCollection.has(nextCard.code))
      
      // Vérifier si la nouvelle carte est rare ou alternative
      checkRarityAndPlayEffect(nextCard)
      
      // Si on arrive à la dernière carte, ajouter automatiquement à la collection
      if (currentCardIndex + 1 === booster.length - 1) {
        setTimeout(() => {
          addToCollection()
        }, 1000) // Attendre 1 seconde pour que l'utilisateur puisse voir la dernière carte
      }
    }
  }

  const handleDragEnd = (event: any, info: any) => {
    setIsDragging(false)
    const threshold = 100 // Distance minimale pour déclencher le changement de carte
    
    if (info.offset.x > threshold && currentCardIndex > 0) {
      // Glissement vers la droite -> carte précédente
      navigateCard('prev')
    } else if (info.offset.x < -threshold && booster && currentCardIndex < booster.length - 1) {
      // Glissement vers la gauche -> carte suivante
      navigateCard('next')
    }
  }
  
  const handleDragStart = (event: any, info: any) => {
    setIsDragging(true)
    setDragDirection(null)
  }
  
  const handleDrag = (event: any, info: any) => {
    if (info.offset.x > 0) {
      setDragDirection('right')
    } else if (info.offset.x < 0) {
      setDragDirection('left')
    }
  }

  const generateParticles = (x: number, y: number) => {
    setParticlePosition({ x, y })
    setShowParticles(true)
    setTimeout(() => setShowParticles(false), 2000)
  }

  const handleCardHover = (cardId: string, isHovering: boolean) => {
    setIsHoveringCard(isHovering ? cardId : null)
  }

  const generateBackgroundParticles = () => {
    const particles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 3 + 1
    }))
    setBackgroundParticles(particles)
    setShowBackgroundEffect(true)
  }

  useEffect(() => {
    if (booster && booster.length > 0) {
      generateBackgroundParticles()
    }
  }, [booster])

  const handleDesktopDragEnd = (event: any, info: any, card: ExtendedCardType) => {
    setIsDesktopDragging(false)
    const threshold = 100 // Distance minimale pour déclencher le changement de carte
    
    if (info.offset.x > threshold && currentCardIndex > 0) {
      // Glissement vers la droite -> carte précédente
      navigateCard('prev')
    } else if (info.offset.x < -threshold && currentCardIndex < booster.length - 1) {
      // Glissement vers la gauche -> carte suivante
      navigateCard('next')
    } else {
      // Si le glissement n'est pas suffisant, afficher les détails de la carte
      setDesktopSelectedCard(card)
      setShowDesktopCardDetails(true)
    }
  }

  const handleDesktopDragStart = (event: any, info: any) => {
    setIsDesktopDragging(true)
    setDesktopDragDirection(null)
  }

  const handleDesktopDrag = (event: any, info: any) => {
    if (info.offset.x > 0) {
      setDesktopDragDirection('right')
    } else if (info.offset.x < 0) {
      setDesktopDragDirection('left')
    }
  }

  // Fonction pour charger la collection de l'utilisateur
  const loadUserCollection = async () => {
    try {
      console.log('Début du chargement de la collection...')
      const response = await fetch('/api/collection')
      console.log('Réponse de l\'API:', response.status, response.statusText)
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Données reçues de l\'API:', data)
      
      // Vérifier si data est un tableau ou s'il contient une propriété cards
      if (Array.isArray(data)) {
        console.log('Format de données: tableau direct')
        const cardCodes = data.map((card: CollectionCard) => card.code)
        console.log('Codes des cartes de la collection:', cardCodes)
        const collectionSet = new Set<string>(cardCodes)
        console.log('Set de la collection créé:', Array.from(collectionSet))
        setUserCollection(collectionSet)
        setSeenCards(collectionSet)
      } else if (data.cards && Array.isArray(data.cards)) {
        console.log('Format de données: objet avec propriété cards')
        console.log('Nombre de cartes dans la collection:', data.cards.length)
        const cardCodes = data.cards.map((card: CollectionCard) => card.code)
        console.log('Codes des cartes de la collection:', cardCodes)
        const collectionSet = new Set<string>(cardCodes)
        console.log('Set de la collection créé:', Array.from(collectionSet))
        setUserCollection(collectionSet)
        setSeenCards(collectionSet)
      } else {
        console.error('Format de données invalide:', data)
        // Initialiser avec un Set vide si pas de données
        setUserCollection(new Set<string>())
        setSeenCards(new Set<string>())
      }
    } catch (error) {
      console.error('Erreur détaillée lors du chargement de la collection:', error)
      // Initialiser avec un Set vide en cas d'erreur
      setUserCollection(new Set<string>())
      setSeenCards(new Set<string>())
    }
  }

  useEffect(() => {
    // Charger la collection de l'utilisateur au chargement du composant
    loadUserCollection()
  }, [])

  useEffect(() => {
    // Charger le son pour les nouvelles cartes
    newCardAudioRef.current = new Audio('/sounds/new-card.mp3')
  }, [])

  const playNewCardSound = () => {
    if (newCardAudioRef.current) {
      newCardAudioRef.current.currentTime = 0
      newCardAudioRef.current.play()
    }
  }

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  // Ajout d'un useEffect pour nettoyer les effets
  useEffect(() => {
    return () => {
      setShowRareEffect(false)
      setShowAltArtEffect(false)
      setShowUltraRareEffect(false)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-4 relative overflow-hidden">
      {/* Arrière-plan dynamique */}
      <AnimatePresence>
        {showBackgroundEffect && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-0"
          >
            {backgroundParticles.map((particle) => (
              <motion.div
                key={particle.id}
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: [0, 0.5, 0],
                  y: [particle.y, particle.y - 100],
                  x: [particle.x, particle.x + (Math.random() - 0.5) * 50]
                }}
                transition={{ 
                  duration: 10 + Math.random() * 20,
                  repeat: Infinity,
                  repeatType: "loop",
                  delay: Math.random() * 5
                }}
                className="absolute rounded-full bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20"
                style={{ 
                  width: particle.size * 10, 
                  height: particle.size * 10,
                  filter: 'blur(2px)'
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      <Toaster position="top-center" richColors />
      <div className="container mx-auto max-w-7xl relative z-10">
      <div className="text-center mb-8">
          <motion.h1 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, type: "spring" }}
            className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400"
          >
            Ouverture de Booster
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl text-gray-300"
          >
            Sélectionnez un set et ouvrez un booster pour découvrir de nouvelles cartes !
          </motion.p>
          
      
        </div>
        
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-col md:flex-row gap-4 items-center justify-center mb-8 bg-white/10 p-6 rounded-xl shadow-2xl backdrop-blur-sm border border-white/20"
        >
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            <Select value={selectedSet} onValueChange={setSelectedSet}>
              <SelectTrigger className="w-[300px] bg-indigo-900/80 border-indigo-400/30 text-white hover:bg-indigo-800/90 transition-all duration-300 shadow-lg">
                <SelectValue placeholder="Sélectionnez un set" />
              </SelectTrigger>
              <SelectContent className="bg-indigo-950/95 border-indigo-400/30 backdrop-blur-md">
                {sets.map((set) => (
                  <SelectItem 
                    key={set} 
                    value={set}
                    className="text-white hover:bg-indigo-800 focus:bg-indigo-800 cursor-pointer"
                  >
                    {set}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
          onClick={openBooster}
            disabled={!selectedSet || isLoading}
            className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Ouverture...</span>
      </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>Ouvrir un Booster</span>
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, 0, -10, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                >
                  🎴
                </motion.div>
              </div>
            )}
          </Button>
        </motion.div>

      <AnimatePresence>
          {showPackOpening && (
          <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: [0, isMobile ? 1.2 : 1.5, isMobile ? 1 : 1.2],
                rotate: [-180, 0, 0],
              }}
              exit={{ 
                scale: [isMobile ? 1 : 1.2, isMobile ? 1.2 : 1.5, 0],
                rotate: [0, 0, 180],
              }}
              transition={{ 
                duration: 2.5,
                times: [0, 0.7, 1],
                ease: "easeInOut"
              }}
              className="fixed inset-0 flex items-center justify-center z-50"
            >
              <div className={`relative ${isMobile ? 'w-56 h-[320px]' : 'w-72 h-[420px]'}`}>
                <img
                  src="/card-back.jpg"
                  alt="Booster Pack"
                  className="w-full h-full object-cover rounded-lg shadow-2xl"
                />
              <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0.8, 1],
                    scale: [1, 1.1, 1, 1.1]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-red-600 via-yellow-400 to-red-600 mix-blend-overlay rounded-lg"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {booster && booster.length > 0 && (
          <div className="relative">
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-full max-w-xs aspect-[63/88] mb-4">
                {currentCardIndex >= 0 && currentCardIndex < booster.length ? (
                  <motion.div
                    key={booster[currentCardIndex].uniqueId}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ 
                      scale: 1, 
                      opacity: 1,
                      x: 0
                    }}
                    exit={{ 
                      scale: 0.8, 
                      opacity: 0,
                      x: dragDirection === 'left' ? -100 : dragDirection === 'right' ? 100 : 0
                    }}
                    transition={{ type: "spring", stiffness: 100, damping: 15 }}
                    className={`relative w-full h-full rounded-lg overflow-hidden shadow-lg ${getRarityGlow(booster[currentCardIndex].rarity)}`}
                    onClick={() => !isDragging && setShowCardDetails(true)}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.1}
                    onDragStart={handleDragStart}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                    whileTap={{ scale: 0.98 }}
                  >
                    {booster[currentCardIndex].imageUrl && !imageErrors[booster[currentCardIndex].uniqueId] ? (
                      <img
                        src={booster[currentCardIndex].imageUrl}
                        alt={booster[currentCardIndex].name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                        <span className="text-gray-400">Image non disponible</span>
                    </div>
                    )}
                    
                    {/* Indicateurs de direction */}
                    {isDragging && (
                      <>
                        {dragDirection === 'left' && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.7 }}
                            className="absolute top-1/2 left-4 bg-black bg-opacity-50 p-2 rounded-full"
                          >
                            <ChevronLeft size={24} className="text-white" />
                          </motion.div>
                        )}
                        {dragDirection === 'right' && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.7 }}
                            className="absolute top-1/2 right-4 bg-black bg-opacity-50 p-2 rounded-full"
                          >
                            <ChevronRight size={24} className="text-white" />
                          </motion.div>
                        )}
                      </>
                    )}
                    
                    {/* Indicateur de dernière carte */}
                    {currentCardIndex === booster.length - 1 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute top-4 right-4 bg-black bg-opacity-70 px-3 py-1 rounded-full"
                      >
                        <span className="text-xs text-white font-medium">Ajout automatique...</span>
                      </motion.div>
                    )}
                    
                    {/* Indicateur de carte rare */}
                    {['SEC', 'SR', 'L'].includes(booster[currentCardIndex].rarity) && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute top-4 left-4 bg-black bg-opacity-70 px-3 py-1 rounded-full"
                      >
                        <span className="text-xs text-yellow-400 font-medium">Rare!</span>
                      </motion.div>
                    )}
                    
                    {/* Indicateur de carte alternative */}
                    {(booster[currentCardIndex].imageUrl && booster[currentCardIndex].imageUrl.includes('_p1')) || booster[currentCardIndex].isParallel && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute top-4 left-4 bg-black bg-opacity-70 px-3 py-1 rounded-full"
                      >
                        <span className="text-xs text-pink-400 font-medium">Alternative!</span>
                      </motion.div>
                    )}

                    {/* Indicateur de carte nouvelle */}
                    {booster && currentCardIndex >= 0 && !userCollection.has(booster[currentCardIndex].code) && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 260,
                          damping: 20,
                          duration: 0.5
                        }}
                        className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-2 py-1 rounded-full text-sm font-bold shadow-lg z-10 flex items-center gap-1"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>New!</span>
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center">
                    <p className="text-gray-400">Aucune carte à afficher</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between w-full max-w-xs mb-4">
                <Button
                  onClick={() => navigateCard('prev')}
                  disabled={currentCardIndex <= 0}
                  className="bg-gray-700 hover:bg-gray-600 text-white rounded-full p-2"
                >
                  <ChevronLeft size={24} />
                </Button>
                
                <div className="flex items-center">
                  <span className="text-sm font-medium">
                    {currentCardIndex + 1} / {booster ? booster.length : 0}
                  </span>
                </div>
                
                <Button
                  onClick={() => navigateCard('next')}
                  disabled={!booster || currentCardIndex >= booster.length - 1}
                  className="bg-gray-700 hover:bg-gray-600 text-white rounded-full p-2"
                >
                  <ChevronRight size={24} />
                </Button>
              </div>
            </div>
          </div>
        )}

        {booster && booster.length > 0 && newCardsCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 right-4 bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 rounded-full shadow-lg"
          >
            <span className="text-sm text-white font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {newCardsCount} nouvelle{newCardsCount > 1 ? 's' : ''} !
            </span>
          </motion.div>
        )}

        <AnimatePresence>
          {selectedCard && (
              <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedCard(null)}
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: "spring", damping: 20, stiffness: 200 }}
                className={`relative max-w-xl w-full aspect-[63/88] rounded-lg overflow-hidden shadow-2xl ${getRarityGlow(selectedCard.rarity)}`}
                onClick={e => e.stopPropagation()}
              >
                {selectedCard.imageUrl && !imageErrors[selectedCard.uniqueId] ? (
                  <img
                    src={selectedCard.imageUrl}
                    alt={selectedCard.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <span className="text-gray-400">Image non disponible</span>
                    </div>
                )}
                
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-85 p-4">
                  <h3 className="text-lg font-bold">{selectedCard.name}</h3>
                  <p className="text-sm text-gray-300">Rareté: {selectedCard.rarity}</p>
                  <p className="text-sm text-gray-300">Type: {selectedCard.type}</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {showCardDetails && currentCardIndex >= 0 && booster && currentCardIndex < booster.length && (
          <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
              onClick={() => setShowCardDetails(false)}
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: "spring", damping: 20, stiffness: 200 }}
                className={`relative max-w-xl w-full aspect-[63/88] rounded-lg overflow-hidden shadow-2xl ${getRarityGlow(booster[currentCardIndex].rarity)}`}
                onClick={e => e.stopPropagation()}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.1}
                onDragStart={handleDragStart}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
              >
                {booster[currentCardIndex].imageUrl && !imageErrors[booster[currentCardIndex].uniqueId] ? (
                  <img
                    src={booster[currentCardIndex].imageUrl}
                    alt={booster[currentCardIndex].name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <span className="text-gray-400">Image non disponible</span>
                    </div>
                )}
                
                {/* Indicateurs de direction */}
                {isDragging && (
                  <>
                    {dragDirection === 'left' && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.7 }}
                        className="absolute top-1/2 left-4 bg-black bg-opacity-50 p-2 rounded-full"
                      >
                        <ChevronLeft size={24} className="text-white" />
                      </motion.div>
                    )}
                    {dragDirection === 'right' && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.7 }}
                        className="absolute top-1/2 right-4 bg-black bg-opacity-50 p-2 rounded-full"
                      >
                        <ChevronRight size={24} className="text-white" />
                      </motion.div>
                    )}
                  </>
                )}
              </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* Effet pour les cartes rares */}
        <AnimatePresence>
          {showRareEffect && currentRareCard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ 
                  scale: [0.5, 1.2, 1],
                  opacity: [0, 1, 1],
                }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-30"
              />
              
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="relative z-10 text-center"
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, 0, -5, 0],
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                  className="inline-block"
                >
                  <div className="bg-black/80 backdrop-blur-md px-6 py-3 rounded-lg shadow-2xl border border-white/20">
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mb-2">CARTE RARE !</h2>
                    <p className="text-xl text-white">{currentRareCard.name}</p>
                    <p className="text-lg text-purple-300">{currentRareCard.rarity}</p>
                  </div>
                </motion.div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 flex items-center justify-center"
              >
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ 
                      x: Math.random() * window.innerWidth - window.innerWidth / 2,
                      y: Math.random() * window.innerHeight - window.innerHeight / 2,
                      scale: 0,
                      opacity: 0
                    }}
                    animate={{ 
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{ 
                      duration: 1 + Math.random() * 2,
                      repeat: Infinity,
                      delay: Math.random() * 2
                    }}
                    className="absolute"
                  >
                    <Sparkles size={24} className="text-purple-400" />
              </motion.div>
            ))}
              </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        
        {/* Effet pour les cartes alternatives */}
        <AnimatePresence>
          {showAltArtEffect && currentRareCard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ 
                  scale: [0.5, 1.2, 1],
                  opacity: [0, 1, 1],
                }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 opacity-30"
              />
              
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="relative z-10 text-center"
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, 0, -5, 0],
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                  className="inline-block"
                >
                  <div className="bg-black bg-opacity-80 px-6 py-3 rounded-lg shadow-2xl">
                    <h2 className="text-3xl font-bold text-pink-400 mb-2">CARTE ALTERNATIVE !</h2>
                    <p className="text-xl text-white">{currentRareCard.name}</p>
                    <p className="text-lg text-pink-300">Édition Alternative</p>
                  </div>
                </motion.div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 flex items-center justify-center"
              >
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ 
                      x: Math.random() * window.innerWidth - window.innerWidth / 2,
                      y: Math.random() * window.innerHeight - window.innerHeight / 2,
                      scale: 0,
                      opacity: 0
                    }}
                    animate={{ 
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{ 
                      duration: 1 + Math.random() * 2,
                      repeat: Infinity,
                      delay: Math.random() * 2
                    }}
                    className="absolute"
                  >
                    <Sparkles size={24} className="text-pink-400" />
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showDesktopCardDetails && desktopSelectedCard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
              onClick={() => setShowDesktopCardDetails(false)}
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: "spring", damping: 20, stiffness: 200 }}
                className={`relative max-w-xl w-full aspect-[63/88] rounded-lg overflow-hidden shadow-2xl ${getRarityGlow(desktopSelectedCard.rarity)}`}
                onClick={e => e.stopPropagation()}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.1}
                onDragStart={handleDesktopDragStart}
                onDrag={handleDesktopDrag}
                onDragEnd={(e, info) => handleDesktopDragEnd(e, info, desktopSelectedCard)}
              >
                {desktopSelectedCard.imageUrl && !imageErrors[desktopSelectedCard.uniqueId] ? (
                  <img
                    src={desktopSelectedCard.imageUrl}
                    alt={desktopSelectedCard.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <span className="text-gray-400">Image non disponible</span>
                  </div>
                )}
                
                {/* Indicateurs de direction */}
                {isDesktopDragging && (
                  <>
                    {desktopDragDirection === 'left' && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.7 }}
                        className="absolute top-1/2 left-4 bg-black bg-opacity-50 p-2 rounded-full"
                      >
                        <ChevronLeft size={24} className="text-white" />
                      </motion.div>
                    )}
                    {desktopDragDirection === 'right' && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.7 }}
                        className="absolute top-1/2 right-4 bg-black bg-opacity-50 p-2 rounded-full"
                      >
                        <ChevronRight size={24} className="text-white" />
                      </motion.div>
                    )}
                  </>
                )}
                
                {/* Informations de la carte */}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-85 p-4">
                  <h3 className="text-lg font-bold">{desktopSelectedCard.name}</h3>
                  <p className="text-sm text-gray-300">Rareté: {desktopSelectedCard.rarity}</p>
                  <p className="text-sm text-gray-300">Type: {desktopSelectedCard.type}</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Effet pour les cartes ultra rares */}
        <AnimatePresence>
          {showUltraRareEffect && currentRareCard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              {/* Fond avec effet de brillance */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ 
                  scale: [0.5, 1.2, 1],
                  opacity: [0, 1, 1],
                }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-30"
              />
              
              {/* Message principal */}
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="relative z-10 text-center"
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, 0, -5, 0],
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                  className="inline-block"
                >
                  <div className="bg-black/80 backdrop-blur-md px-8 py-4 rounded-lg shadow-2xl border border-white/20">
                    <motion.h2 
                      className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mb-4"
                      animate={{
                        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                      style={{
                        backgroundSize: '200% auto',
                      }}
                    >
                      ULTRA RARE !
                    </motion.h2>
                    <p className="text-2xl text-white mb-2">{currentRareCard.name}</p>
                    <p className="text-xl text-purple-300">{currentRareCard.rarity}</p>
                  </div>
                </motion.div>
              </motion.div>
              
              {/* Particules dorées */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 flex items-center justify-center"
              >
                {ultraRareParticles.map((particle) => (
                  <motion.div
                    key={particle.id}
                    initial={{ 
                      x: particle.x,
                      y: particle.y,
                      scale: 0,
                      opacity: 0
                    }}
                    animate={{ 
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0],
                      x: particle.x + (Math.random() - 0.5) * 200,
                      y: particle.y + (Math.random() - 0.5) * 200,
                    }}
                    transition={{ 
                      duration: 1 + Math.random() * 2,
                      repeat: Infinity,
                      delay: Math.random() * 2
                    }}
                    className="absolute"
                  >
                    <Sparkles size={particle.size * 6} className={particle.color} />
                  </motion.div>
                ))}
              </motion.div>
              
              {/* Effet de halo */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute inset-0"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/20 to-transparent" 
                  style={{ 
                    transform: 'rotate(45deg)',
                    width: '200%',
                    height: '200%'
                  }}
                />
              </motion.div>

              {/* Effet de vague */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute inset-0 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10"
                  style={{
                    transform: 'skewY(-12deg)',
                    width: '200%',
                    height: '200%',
                    animation: 'wave 8s linear infinite'
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-50"
          />
        )}
      </div>
    </div>
  )
} 