import Link from 'next/link'
import { Card } from '@/components/ui/card'

const features = [
  {
    title: 'Deck Builder',
    description: 'Créez et partagez vos decks personnalisés avec notre interface intuitive de glisser-déposer.',
    href: '/deck-builder',
  },
  {
    title: 'Ouverture de Boosters',
    description: 'Vivez l\'expérience d\'ouverture de boosters virtuels avec des animations épiques.',
    href: '/booster-opening',
  },
  {
    title: 'Mode de Jeu',
    description: 'Affrontez l\'IA ou d\'autres joueurs en ligne sur notre plateau de jeu interactif.',
    href: '/game',
  },
  {
    title: 'Collection',
    description: 'Gérez votre collection de cartes et suivez votre progression.',
    href: '/collection',
  },
]

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-4xl font-bold text-blue-600 mb-4">
        Bienvenue sur One Piece Card Game
      </h1>
      <p className="text-xl text-gray-700 mb-8">
        Créez des decks, ouvrez des boosters et jouez en ligne !
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-indigo-600 mb-2">Deck Builder</h2>
          <p className="text-gray-600">Créez et personnalisez vos decks pour affronter vos adversaires.</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-indigo-600 mb-2">Boosters</h2>
          <p className="text-gray-600">Ouvrez des boosters pour obtenir de nouvelles cartes rares.</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-indigo-600 mb-2">Jouer</h2>
          <p className="text-gray-600">Affrontez d'autres joueurs en ligne dans des duels épiques.</p>
        </div>
      </div>
    </div>
  )
}
