'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type CardType = {
  id: string
  name: string
  rarity: 'common' | 'uncommon' | 'rare' | 'super-rare' | 'secret'
  imageUrl: string
}

const PACK_PRICE = 500 // Prix en points/crédits

export default function BoosterOpening() {
  const [isOpening, setIsOpening] = useState(false)
  const [cards, setCards] = useState<CardType[]>([])
  const [credits, setCredits] = useState(1000) // Exemple de crédits

  const generateBoosterCards = (): CardType[] => {
    // Simulation de la génération de cartes (à remplacer par l'API)
    return [
      {
        id: '1',
        name: 'Carte Exemple',
        rarity: 'rare',
        imageUrl: '/cards/example.jpg'
      },
      // Ajoutez plus de cartes ici
    ]
  }

  const openBooster = async () => {
    if (credits < PACK_PRICE) {
      alert('Crédits insuffisants !')
      return
    }

    setIsOpening(true)
    setCredits(credits - PACK_PRICE)

    // Simulation du délai d'ouverture
    setTimeout(() => {
      const newCards = generateBoosterCards()
      setCards(newCards)
      setIsOpening(false)
    }, 2000)
  }

  return (
    <div className="container mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Ouverture de Boosters</h1>
        <p className="text-xl mb-4">Crédits: {credits}</p>
        <button
          onClick={openBooster}
          disabled={isOpening || credits < PACK_PRICE}
          className="px-6 py-3 bg-primary text-white rounded-lg shadow-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {isOpening ? 'Ouverture...' : `Ouvrir un Booster (${PACK_PRICE} crédits)`}
        </button>
      </div>

      <AnimatePresence>
        {cards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
          >
            {cards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, rotateY: 180 }}
                animate={{ opacity: 1, rotateY: 0 }}
                transition={{ delay: index * 0.2 }}
              >
                <Card className={`overflow-hidden ${
                  card.rarity === 'super-rare' ? 'border-yellow-400 border-2' :
                  card.rarity === 'rare' ? 'border-purple-400 border-2' : ''
                }`}>
                  <CardContent className="p-2">
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      className="w-full h-auto rounded"
                    />
                    <div className="mt-2 text-center">
                      <h3 className="font-semibold">{card.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{card.rarity}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 