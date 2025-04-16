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

const updates = [
  {
    title: 'Nouvelle Version Mobile',
    description: 'Interface d\'ouverture de booster optimisée pour mobile avec animations fluides et effets sonores.',
    icon: '📱',
    color: 'bg-gradient-to-br from-blue-500 to-indigo-600',
  },
  {
    title: 'Taux de Drop Mis à Jour',
    description: 'Taux de drop conformes au jeu officiel avec gestion des cartes alternatives et des cartes spéciales.',
    icon: '📊',
    color: 'bg-gradient-to-br from-purple-500 to-pink-600',
  },
  {
    title: 'Effets Sonores',
    description: 'Nouveaux effets sonores pour les cartes rares et alternatives lors de l\'ouverture des boosters.',
    icon: '🔊',
    color: 'bg-gradient-to-br from-green-500 to-teal-600',
  },
]

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <div className="w-full max-w-4xl mb-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Important : Mise à jour majeure prévue
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>
                Dans l'après-midi, les collections de cartes seront réinitialisées. Les cartes des decks de démarrage seront automatiquement ajoutées à votre collection. Merci de votre compréhension.
              </p>
            </div>
          </div>
        </div>
      </div>

      <h1 className="text-4xl font-bold text-blue-600 mb-4">
        Bienvenue sur One Piece Card Game
      </h1>
      <div className="w-full max-w-4xl mb-12 bg-gradient-to-b from-blue-50 to-indigo-50 p-8 rounded-2xl shadow-xl">
        <h2 className="text-3xl font-bold text-blue-600 mb-6 text-center">
          ✨ Nouvelles Fonctionnalités ✨
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {updates.map((update, index) => (
            <div 
              key={index} 
              className={`${update.color} p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1`}
            >
              <div className="text-5xl mb-4 text-white">{update.icon}</div>
              <h3 className="text-xl font-bold text-white mb-2">{update.title}</h3>
              <p className="text-blue-50">{update.description}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xl text-gray-700 mb-8">
        Créez des decks, ouvrez des boosters et jouez en ligne !
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mb-12">
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
