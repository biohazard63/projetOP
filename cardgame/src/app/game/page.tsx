'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'framer-motion'

type CardType = {
  id: string
  name: string
  type: string
  power?: number
  counter?: number
  imageUrl: string
  tapped: boolean
}

type GameState = {
  life: number
  hand: CardType[]
  field: CardType[]
  deck: number // Nombre de cartes restantes
}

export default function Game() {
  const [playerState, setPlayerState] = useState<GameState>({
    life: 4,
    hand: [
      {
        id: '1',
        name: 'Monkey D. Luffy',
        type: 'Leader',
        power: 6000,
        imageUrl: '/cards/luffy.jpg',
        tapped: false
      },
      // Ajoutez plus de cartes
    ],
    field: [],
    deck: 50
  })

  const [opponentState, setOpponentState] = useState<GameState>({
    life: 4,
    hand: [], // Cartes cachées
    field: [],
    deck: 50
  })

  const [selectedCard, setSelectedCard] = useState<CardType | null>(null)

  const playCard = (card: CardType) => {
    if (selectedCard?.id === card.id) {
      setPlayerState(prev => ({
        ...prev,
        hand: prev.hand.filter(c => c.id !== card.id),
        field: [...prev.field, card]
      }))
      setSelectedCard(null)
    } else {
      setSelectedCard(card)
    }
  }

  const tapCard = (cardId: string) => {
    setPlayerState(prev => ({
      ...prev,
      field: prev.field.map(card =>
        card.id === cardId ? { ...card, tapped: !card.tapped } : card
      )
    }))
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Plateau de jeu */}
      <div className="container mx-auto py-4">
        {/* Zone adversaire */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-4">
              <Card className="w-24">
                <CardContent className="p-2 text-center">
                  <p className="font-bold">Vie</p>
                  <p className="text-2xl">{opponentState.life}</p>
                </CardContent>
              </Card>
              <Card className="w-24">
                <CardContent className="p-2 text-center">
                  <p className="font-bold">Deck</p>
                  <p className="text-2xl">{opponentState.deck}</p>
                </CardContent>
              </Card>
            </div>
            <div className="flex space-x-2">
              {Array(opponentState.hand.length).fill(0).map((_, i) => (
                <div
                  key={i}
                  className="w-12 h-16 bg-blue-500 rounded"
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-5 gap-4 min-h-[200px] bg-white rounded-lg p-4">
            {opponentState.field.map(card => (
              <Card key={card.id} className="relative">
                <img
                  src={card.imageUrl}
                  alt={card.name}
                  className="w-full h-auto"
                />
              </Card>
            ))}
          </div>
        </div>

        {/* Zone joueur */}
        <div>
          <div className="grid grid-cols-5 gap-4 min-h-[200px] bg-white rounded-lg p-4 mb-4">
            {playerState.field.map(card => (
              <motion.div
                key={card.id}
                animate={{ rotate: card.tapped ? 90 : 0 }}
                onClick={() => tapCard(card.id)}
                className="cursor-pointer"
              >
                <Card className="relative">
                  <img
                    src={card.imageUrl}
                    alt={card.name}
                    className="w-full h-auto"
                  />
                  {card.power && (
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white px-2 rounded">
                      {card.power}
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Card className="w-24">
                <CardContent className="p-2 text-center">
                  <p className="font-bold">Vie</p>
                  <p className="text-2xl">{playerState.life}</p>
                </CardContent>
              </Card>
              <Card className="w-24">
                <CardContent className="p-2 text-center">
                  <p className="font-bold">Deck</p>
                  <p className="text-2xl">{playerState.deck}</p>
                </CardContent>
              </Card>
            </div>
            <div className="flex space-x-2">
              {playerState.hand.map(card => (
                <motion.div
                  key={card.id}
                  whileHover={{ y: -10 }}
                  onClick={() => playCard(card)}
                  className={`cursor-pointer ${selectedCard?.id === card.id ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <Card className="relative w-24">
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      className="w-full h-auto"
                    />
                    {card.power && (
                      <div className="absolute bottom-1 right-1 bg-black/70 text-white px-2 rounded">
                        {card.power}
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 