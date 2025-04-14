'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function GameNav() {
  const router = useRouter()

  return (
    <div className="bg-gray-800 p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-white text-xl font-bold">One Piece Card Game</h1>
        <div className="flex space-x-4">
          <Button
            onClick={() => router.push('/game/select-deck')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Changer de deck
          </Button>
          <Button
            onClick={() => router.push('/decks')}
            className="bg-green-600 hover:bg-green-700"
          >
            Gérer mes decks
          </Button>
        </div>
      </div>
    </div>
  )
} 