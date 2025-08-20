import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { GameState, GamePhase, SetupPhase, GameCard, CardType, CardColor } from '@/types/game'

export async function POST() {
  try {
    console.log('=== DÉBUT INITIALISATION DU JEU ===')
    
    const session = await auth()
    
    if (!session?.user?.email) {
      console.log('❌ Erreur: Utilisateur non authentifié')
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    console.log('✅ Utilisateur authentifié:', session.user.email)

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      console.log('❌ Erreur: Utilisateur non trouvé dans la base de données')
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    console.log('✅ Utilisateur trouvé:', user.name)

    // Récupérer l'ID du deck actif depuis le cookie
    const cookieStore = cookies()
    const activeDeckId = cookieStore.get('activeDeckId')?.value

    console.log('🔍 Recherche du deck actif:', activeDeckId)

    if (!activeDeckId) {
      console.log('❌ Aucun deck actif trouvé dans les cookies')
      return NextResponse.json(
        { error: 'Aucun deck actif' },
        { status: 404 }
      )
    }

    // Récupérer le deck actif
    const deck = await prisma.deck.findFirst({
      where: {
        id: activeDeckId,
        userId: user.id
      },
      include: {
        versions: {
          include: {
            cards: {
              include: {
                card: true
              }
            }
          }
        }
      }
    });

    if (!deck) {
      return NextResponse.json(
        { error: 'Deck actif non trouvé' },
        { status: 404 }
      );
    }

    // Obtenir la dernière version du deck
    const latestVersion = deck.versions[deck.versions.length - 1];
    if (!latestVersion) {
      return NextResponse.json(
        { error: 'Aucune version du deck trouvée' },
        { status: 404 }
      );
    }

    // Transformer les cartes du deck
    const deckCards = latestVersion.cards.map(dc => ({
      id: dc.card.id,
      name: dc.card.name,
      type: dc.card.type,
      color: dc.card.color,
      cost: dc.card.cost,
      power: dc.card.power,
      counter: dc.card.counter,
      effect: dc.card.effect,
      rarity: dc.card.rarity,
      imageUrl: dc.card.imageUrl,
      quantity: dc.quantity
    }));

    console.log('✅ Deck actif trouvé:', deck.name, 'avec', deckCards.length, 'cartes')

    // Fonction pour convertir une carte de la base de données en GameCard
    const convertToGameCard = (card: any, isFaceUp: boolean = false): GameCard => {
      console.log(`🎴 Conversion de la carte ${card.name} (type: ${card.type}, face ${isFaceUp ? 'visible' : 'cachée'})`)
      
      // Détecter les propriétés spéciales
      const hasTrigger = !!card.trigger; // Le trigger est dans un champ séparé
      const hasRush = card.effect?.includes('[Rush]') || false;
      const hasBlocker = card.effect?.includes('[Blocker]') || false;
      const hasDoubleAttack = card.effect?.includes('[Double Attack]') || false;
      const hasCounter = card.counter !== null && card.counter !== undefined; // Utiliser le champ counter
      
      return {
        id: card.id,
        name: card.name,
        type: card.type as CardType,
        color: card.color as CardColor,
        cost: card.cost || 0,
        power: card.power || 0,
        imageUrl: card.imageUrl || '',
        effect: card.effect || '',
        trigger: card.trigger || '',
        hasTrigger: hasTrigger,
        hasRush: hasRush,
        hasBlocker: hasBlocker,
        hasDoubleAttack: hasDoubleAttack,
        hasCounter: hasCounter,
        counterValue: card.counter || 0, // Utiliser directement le champ counter
        isFaceUp: isFaceUp
      }
    }

    // Préparer les cartes du joueur
    console.log('🔄 Préparation des cartes du joueur')
    const playerCards = deckCards.map(dc => convertToGameCard(dc, dc.type === 'LEADER'))
    
    // Séparer le leader des autres cartes
    const playerLeader = playerCards.find(card => card.type === 'LEADER')
    const playerDeckWithoutLeader = playerCards.filter(card => card.type !== 'LEADER')

    if (!playerLeader) {
      console.log('❌ Erreur: Aucun leader trouvé dans le deck du joueur')
      return NextResponse.json(
        { error: 'Aucun leader dans le deck' },
        { status: 400 }
      )
    }

    console.log('✅ Leader du joueur trouvé:', playerLeader.name)

    // Générer un deck aléatoire pour l'adversaire
    console.log('🔄 Génération du deck adversaire')
    const allCards = await prisma.card.findMany()
    const shuffledCards = [...allCards].sort(() => Math.random() - 0.5)
    const opponentLeaderCard = allCards.find(card => card.type === 'LEADER')
    if (!opponentLeaderCard) {
      console.log('❌ Erreur: Aucun leader trouvé pour l\'adversaire')
      return NextResponse.json(
        { error: 'Erreur d\'initialisation' },
        { status: 500 }
      )
    }

    const opponentLeader = convertToGameCard(opponentLeaderCard, true)
    console.log('✅ Leader adversaire choisi:', opponentLeader.name)

    const opponentDeckCards = shuffledCards
      .filter(card => card.type !== 'LEADER')
      .slice(0, 50)
      .map(card => convertToGameCard(card, false))

    console.log('✅ Deck adversaire généré:', opponentDeckCards.length, 'cartes')

    // Mélanger les decks
    console.log('🔄 Mélange des decks')
    const shuffledPlayerDeck = [...playerDeckWithoutLeader].sort(() => Math.random() - 0.5)
    const shuffledOpponentDeck = [...opponentDeckCards].sort(() => Math.random() - 0.5)

    // Distribuer les mains initiales (5 cartes chacun)
    console.log('🔄 Distribution des mains initiales')
    const playerHand = shuffledPlayerDeck.slice(0, 5).map(card => ({ ...card, isFaceUp: true }))
    const playerDeck = shuffledPlayerDeck.slice(5).map(card => ({ ...card, isFaceUp: false }))
    const opponentHand = shuffledOpponentDeck.slice(0, 5).map(card => ({ ...card, isFaceUp: false }))
    const opponentDeck = shuffledOpponentDeck.slice(5).map(card => ({ ...card, isFaceUp: false }))

    // Créer les decks DON
    console.log('🔄 Préparation des decks DON')
    const createDonCard = (id: number): GameCard => ({
      id: `don_${id}`,
      name: 'DON!!',
      type: 'DON' as CardType,
      color: 'BLACK' as CardColor,
      cost: 0,
      power: 0,
      imageUrl: '/don.png',
      effect: 'DON!! Card',
      isFaceUp: false
    });

    // Créer 10 cartes DON pour chaque joueur
    const playerDonDeck = Array.from({ length: 10 }, (_, i) => createDonCard(i));
    const opponentDonDeck = Array.from({ length: 10 }, (_, i) => createDonCard(i + 10));

    console.log('✅ Decks DON préparés:', playerDonDeck.length, 'cartes pour chaque joueur')

    // Initialiser l'état du jeu
    console.log('🔄 Création de l\'état initial du jeu')
    const gameState: GameState = {
      id: 'game_' + Date.now(),
      player: {
        id: 'player',
        name: user.name || 'Joueur',
        lifePoints: 5,
        deck: playerDeck,
        hand: playerHand,
        field: [],
        leader: playerLeader,
        activeDon: 0,
        donDeck: playerDonDeck,
        usedDonDeck: [],
        discardPile: [],
        trash: [],
        donAddedThisTurn: 0
      },
      opponent: {
        id: 'opponent',
        name: 'Adversaire',
        lifePoints: 5,
        deck: opponentDeck,
        hand: opponentHand,
        field: [],
        leader: opponentLeader,
        activeDon: 0,
        donDeck: opponentDonDeck,
        usedDonDeck: [],
        discardPile: [],
        trash: [],
        donAddedThisTurn: 0
      },
      currentPhase: 'SETUP' as GamePhase,
      setupPhase: 'CHOOSE_LEADER' as SetupPhase,
      currentPlayer: 'player',
      turnNumber: 1,
      winner: null,
      canPlayCard: false,
      canAttack: false,
      canEndTurn: false,
      gameOver: false,
      isFirstTurn: true
    }

    console.log('✅ État du jeu initialisé')
    console.log('=== FIN INITIALISATION DU JEU ===')

    return NextResponse.json(gameState)
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation du jeu:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
} 