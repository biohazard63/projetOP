import { useState, useCallback } from 'react'
import { GameState, GameCard, PlayerState, GamePhase, SetupPhase } from '@/types/game'

const INITIAL_LIFE_POINTS = 5
const INITIAL_HAND_SIZE = 5
const MAX_HAND_SIZE = 7

export function useGame(playerDeck: GameCard[], opponentDeck: GameCard[]) {
  const [gameState, setGameState] = useState<GameState>({
    id: 'game_' + Date.now(),
    player: {
      id: 'player',
      name: 'Joueur',
      lifePoints: INITIAL_LIFE_POINTS,
      deck: [...playerDeck],
      hand: [],
      field: [],
      donDeck: [],
      trash: [],
      activeDon: 0,
      donAddedThisTurn: 0,
      leader: null,
      usedDonDeck: [],
      discardPile: []
    },
    opponent: {
      id: 'opponent',
      name: 'Adversaire',
      lifePoints: INITIAL_LIFE_POINTS,
      deck: [...opponentDeck],
      hand: [],
      field: [],
      donDeck: [],
      trash: [],
      activeDon: 0,
      donAddedThisTurn: 0,
      leader: null,
      usedDonDeck: [],
      discardPile: []
    },
    currentPhase: 'SETUP',
    setupPhase: 'CHOOSE_FIRST',
    currentPlayer: 'player',
    turnNumber: 1,
    canPlayCard: false,
    canAttack: false,
    canEndTurn: false,
    gameOver: false,
    isFirstTurn: true,
    winner: null
  })

  const chooseFirst = useCallback((player: 'player' | 'opponent') => {
    setGameState(prevState => ({
      ...prevState,
      currentPlayer: player,
      setupPhase: 'CHOOSE_LEADER',
      lastAction: `${player === 'player' ? 'Vous' : "L'adversaire"} commence la partie`,
    }))
  }, [])

  const chooseLeader = useCallback((player: 'player' | 'opponent', leader: GameCard) => {
    setGameState(prevState => {
      const updatedDeck = prevState[player].deck.filter(card => card.id !== leader.id)
      return {
        ...prevState,
        [player]: {
          ...prevState[player],
          deck: updatedDeck,
          leader: { ...leader, isFaceUp: true },
        },
        setupPhase: 'SET_LIFE',
        lastAction: `${player === 'player' ? 'Vous avez' : "L'adversaire a"} choisi ${leader.name} comme Leader`,
      }
    })
  }, [])

  const setLife = useCallback((player: 'player' | 'opponent') => {
    setGameState(prevState => {
      const lifeCards = prevState[player].deck.slice(0, INITIAL_LIFE_POINTS)
      const remainingDeck = prevState[player].deck.slice(INITIAL_LIFE_POINTS)
      return {
        ...prevState,
        [player]: {
          ...prevState[player],
          deck: remainingDeck,
          life: lifeCards.map(card => ({ ...card, isFaceUp: false })),
        },
        setupPhase: 'SET_DON',
        lastAction: `${player === 'player' ? 'Vous avez' : "L'adversaire a"} placé ${INITIAL_LIFE_POINTS} cartes en Vie`,
      }
    })
  }, [])

  const setDon = useCallback((player: 'player' | 'opponent') => {
    setGameState(prevState => {
      const donCards = prevState[player].deck
        .filter(card => card.type === 'DON')
        .slice(0, 10)
      const remainingDeck = prevState[player].deck.filter(
        card => !donCards.find(don => don.id === card.id)
      )
      return {
        ...prevState,
        [player]: {
          ...prevState[player],
          deck: remainingDeck,
          donDeck: donCards.map(card => ({ ...card, isFaceUp: false })),
        },
        setupPhase: 'DRAW_STARTING',
        lastAction: `${player === 'player' ? 'Vous avez' : "L'adversaire a"} placé 10 DON!!`,
      }
    })
  }, [])

  const drawStarting = useCallback((player: 'player' | 'opponent') => {
    setGameState(prevState => {
      const drawnCards = prevState[player].deck.slice(0, INITIAL_HAND_SIZE)
      const remainingDeck = prevState[player].deck.slice(INITIAL_HAND_SIZE)
      return {
        ...prevState,
        [player]: {
          ...prevState[player],
          deck: remainingDeck,
          hand: drawnCards,
        },
        setupPhase: 'MULLIGAN',
        lastAction: `${player === 'player' ? 'Vous avez' : "L'adversaire a"} pioché ${INITIAL_HAND_SIZE} cartes`,
      }
    })
  }, [])

  const mulligan = useCallback((player: 'player' | 'opponent') => {
    setGameState(prevState => {
      const currentHand = prevState[player].hand
      const newDeck = [...prevState[player].deck, ...currentHand]
      const shuffledDeck = newDeck.sort(() => Math.random() - 0.5)
      const newHand = shuffledDeck.slice(0, INITIAL_HAND_SIZE)
      const remainingDeck = shuffledDeck.slice(INITIAL_HAND_SIZE)
      return {
        ...prevState,
        [player]: {
          ...prevState[player],
          deck: remainingDeck,
          hand: newHand,
          hasMulliganed: true,
        },
        setupPhase: 'READY',
        lastAction: `${player === 'player' ? 'Vous avez' : "L'adversaire a"} fait un mulligan`,
      }
    })
  }, [])

  const ready = useCallback(() => {
    setGameState(prevState => {
      const nextPlayer = prevState.currentPlayer === 'player' ? 'opponent' : 'player'
      if (nextPlayer === 'player') {
        return {
          ...prevState,
          currentPhase: 'DRAW',
          setupPhase: 'READY',
          lastAction: 'La partie commence !',
        }
      }
      return {
        ...prevState,
        currentPlayer: nextPlayer,
        setupPhase: 'CHOOSE_LEADER',
      }
    })
  }, [])

  const drawCard = useCallback((playerId: 'player' | 'opponent') => {
    setGameState(prevState => {
      const player = prevState[playerId]
      if (player.deck.length === 0) return prevState

      const [drawnCard, ...remainingDeck] = player.deck
      return {
        ...prevState,
        [playerId]: {
          ...player,
          deck: remainingDeck,
          hand: [...player.hand, drawnCard],
        },
        lastAction: `${player.name} a pioché une carte`,
      }
    })
  }, [])

  const playCard = useCallback((playerId: 'player' | 'opponent', card: GameCard) => {
    setGameState(prevState => {
      const player = prevState[playerId]
      if (!player.hand.find(c => c.id === card.id)) return prevState
      if (player.activeDon < card.cost) return prevState

      const updatedHand = player.hand.filter(c => c.id !== card.id)
      const updatedField = [...player.field, { ...card, position: 'ACTIVE' }]
      const updatedDon = player.activeDon - card.cost

      return {
        ...prevState,
        [playerId]: {
          ...player,
          hand: updatedHand,
          field: updatedField,
          activeDon: updatedDon,
        },
        lastAction: `${player.name} a joué ${card.name}`,
      }
    })
  }, [])

  const attack = useCallback((attackerId: 'player' | 'opponent', attacker: GameCard, target: GameCard) => {
    setGameState(prevState => {
      const attackerPlayer = prevState[attackerId]
      const defenderId = attackerId === 'player' ? 'opponent' : 'player'
      const defenderPlayer = prevState[defenderId]

      if (attacker.hasAttacked) return prevState
      if (attacker.position !== 'ACTIVE') return prevState
      if (target.position === 'ACTIVE') return prevState

      const updatedAttackerField = attackerPlayer.field.map(card =>
        card.id === attacker.id ? { ...card, hasAttacked: true, position: 'RESTED' } : card
      )

      let updatedDefenderField = defenderPlayer.field
      let updatedDefenderLife = defenderPlayer.lifePoints
      let updatedTrash = [...defenderPlayer.trash]

      if (target.isLeader) {
        updatedDefenderLife -= 1
        if (updatedDefenderLife <= 0) {
          return {
            ...prevState,
            [attackerId]: {
              ...attackerPlayer,
              field: updatedAttackerField,
            },
            [defenderId]: {
              ...defenderPlayer,
              lifePoints: updatedDefenderLife,
            },
            gameOver: true,
            winner: attackerId,
            lastAction: `${attackerPlayer.name} a gagné la partie !`,
          }
        }
      } else {
        updatedDefenderField = defenderPlayer.field.filter(card => card.id !== target.id)
        updatedTrash = [...updatedTrash, target]
      }

      return {
        ...prevState,
        [attackerId]: {
          ...attackerPlayer,
          field: updatedAttackerField,
        },
        [defenderId]: {
          ...defenderPlayer,
          field: updatedDefenderField,
          lifePoints: updatedDefenderLife,
          trash: updatedTrash,
        },
        lastAction: `${attackerPlayer.name} a attaqué avec ${attacker.name}`,
      }
    })
  }, [])

  const attachCard = useCallback((playerId: 'player' | 'opponent', sourceCard: GameCard, targetCard: GameCard) => {
    setGameState(prevState => {
      const player = prevState[playerId]
      if (!player.hand.find(c => c.id === sourceCard.id)) return prevState
      if (!player.field.find(c => c.id === targetCard.id)) return prevState

      const updatedHand = player.hand.filter(c => c.id !== sourceCard.id)
      const updatedField = player.field.map(card => 
        card.id === targetCard.id 
          ? { ...card, attachedCards: [...(card.attachedCards || []), sourceCard] }
          : card
      )

      return {
        ...prevState,
        [playerId]: {
          ...player,
          hand: updatedHand,
          field: updatedField,
        },
        lastAction: `${player.name} a attaché ${sourceCard.name} à ${targetCard.name}`,
      }
    })
  }, [])

  const endTurn = useCallback(() => {
    setGameState(prevState => {
      const nextPlayer = prevState.currentPlayer === 'player' ? 'opponent' : 'player'
      const nextPhase: GamePhase = 'DRAW'
      const nextTurnNumber = nextPlayer === 'player' ? prevState.turnNumber + 1 : prevState.turnNumber

      return {
        ...prevState,
        currentPlayer: nextPlayer,
        currentPhase: nextPhase,
        turnNumber: nextTurnNumber,
        canPlayCard: false,
        canAttack: false,
        canEndTurn: false,
        [prevState.currentPlayer]: {
          ...prevState[prevState.currentPlayer],
          donAddedThisTurn: 0,
        },
        lastAction: `Tour de ${nextPlayer === 'player' ? 'l\'adversaire' : 'vous'}`,
      }
    })
  }, [])

  const addDon = useCallback((playerId: 'player' | 'opponent') => {
    setGameState(prevState => {
      const player = prevState[playerId]
      if (player.donDeck.length >= 10) return prevState
      if (player.donAddedThisTurn >= 2) return prevState

      const newDon: GameCard = {
        id: `don-${Date.now()}`,
        name: 'DON!!',
        cost: 0,
        power: 0,
        type: 'DON',
        color: 'BLACK',
        imageUrl: '/don.png',
        isDon: true,
      }

      return {
        ...prevState,
        [playerId]: {
          ...player,
          donDeck: [...player.donDeck, newDon],
          activeDon: (player.activeDon || 0) + 2,
          donAddedThisTurn: (player.donAddedThisTurn || 0) + 1
        },
        lastAction: `${player.name} a ajouté 2 DON!!`,
      }
    })
  }, [])

  const activateEffect = useCallback((playerId: 'player' | 'opponent', card: GameCard, targetCard?: GameCard) => {
    setGameState(prevState => {
      if (!card.effects || card.effects.length === 0) return prevState;
      
      // Exécuter tous les effets de la carte
      let newState = { ...prevState };
      for (const effect of card.effects) {
        if (effect.timing === 'IMMEDIATE') {
          newState = effect.execute(newState, card, targetCard);
        }
      }
      
      return newState;
    });
  }, []);

  const blockAttack = useCallback((playerId: 'player' | 'opponent', blocker: GameCard, attacker: GameCard) => {
    setGameState(prevState => {
      const player = prevState[playerId];
      if (!player.field.find(c => c.id === blocker.id)) return prevState;
      if (!blocker.hasBlocker) return prevState;
      
      const updatedField = player.field.map(card => 
        card.id === blocker.id 
          ? { ...card, isBlocking: true, blocker: attacker }
          : card
      );
      
      return {
        ...prevState,
        [playerId]: {
          ...player,
          field: updatedField,
        },
        lastAction: `${player.name} a bloqué l'attaque avec ${blocker.name}`,
      };
    });
  }, []);

  const counterAttack = useCallback((playerId: 'player' | 'opponent', counterCard: GameCard, attacker: GameCard) => {
    setGameState(prevState => {
      const player = prevState[playerId];
      if (!player.hand.find(c => c.id === counterCard.id)) return prevState;
      if (!counterCard.hasCounter) return prevState;
      
      const updatedHand = player.hand.filter(c => c.id !== counterCard.id);
      const updatedTrash = [...player.trash, counterCard];
      
      // Réduire la puissance de l'attaquant
      const defenderId = playerId === 'player' ? 'opponent' : 'player';
      const defender = prevState[defenderId];
      const updatedDefenderField = defender.field.map(card => 
        card.id === attacker.id 
          ? { ...card, power: Math.max(0, card.power - (counterCard.counterValue || 0)) }
          : card
      );
      
      return {
        ...prevState,
        [playerId]: {
          ...player,
          hand: updatedHand,
          trash: updatedTrash,
        },
        [defenderId]: {
          ...defender,
          field: updatedDefenderField,
        },
        lastAction: `${player.name} a utilisé ${counterCard.name} comme contre`,
      };
    });
  }, []);

  return {
    gameState,
    chooseFirst,
    chooseLeader,
    setLife,
    setDon,
    drawStarting,
    mulligan,
    ready,
    drawCard,
    playCard,
    attack,
    endTurn,
    addDon,
    attachCard,
    activateEffect,
    blockAttack,
    counterAttack,
  }
} 