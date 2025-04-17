'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'

const features = [
  {
    title: 'Deck Builder',
    description: 'Créez et partagez vos decks personnalisés avec notre interface intuitive de glisser-déposer.',
    href: '/deck-builder',
    icon: '⚔️',
    color: 'from-red-500 to-orange-500',
  },
  {
    title: 'Ouverture de Boosters',
    description: 'Vivez l\'expérience d\'ouverture de boosters virtuels avec des animations épiques.',
    href: '/booster-opening',
    icon: '🎴',
    color: 'from-blue-500 to-indigo-500',
  },
  {
    title: 'Mode de Jeu',
    description: 'Affrontez l\'IA ou d\'autres joueurs en ligne sur notre plateau de jeu interactif.',
    href: '/game',
    icon: '🎮',
    color: 'from-green-500 to-teal-500',
  },
  {
    title: 'Collection',
    description: 'Gérez votre collection de cartes et suivez votre progression.',
    href: '/collection',
    icon: '📚',
    color: 'from-purple-500 to-pink-500',
  },
]

const updates = [
  {
    title: 'Nouveaux Effets Visuels',
    description: 'Animations spectaculaires pour les cartes ultra rares avec effets de particules dorées et halos lumineux.',
    icon: '✨',
    color: 'from-amber-500 to-yellow-600',
  },
  {
    title: 'Détection Ultra Rare',
    description: 'Système amélioré de détection des cartes ultra rares incluant les versions alt art et plus, les SEC et les cartes promotionnelles.',
    icon: '🌟',
    color: 'from-purple-500 to-pink-600',
  },
  {
    title: 'Design Modern',
    description: 'Interface repensée avec de nouveaux dégradés et effets visuels pour une expérience plus immersive.',
    icon: '🎨',
    color: 'from-indigo-500 to-purple-600',
  },
  {
    title: 'Traductions Complètes',
    description: 'Toutes les cartes sont maintenant disponibles en français avec leurs effets et descriptions traduits.',
    icon: '🌍',
    color: 'from-green-500 to-emerald-600',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/one-piece-bg.jpg')] bg-cover bg-center opacity-20"></div>
        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="text-center animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500">
              One Piece Card Game
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Explorez le monde de One Piece à travers des duels de cartes épiques
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/booster-opening">
                <button className="px-8 py-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-full font-bold shadow-lg hover:shadow-red-500/30 transition-all hover:scale-105 active:scale-95">
                  Ouvrir un Booster
                </button>
              </Link>
              <Link href="/deck-builder">
                <button className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full font-bold shadow-lg hover:shadow-blue-500/30 transition-all hover:scale-105 active:scale-95">
                  Créer un Deck
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
   {/* Updates Section */}
   <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-white">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 to-amber-500">Nouvelles Fonctionnalités</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {updates.map((update, index) => (
            <div
              key={index}
              className={`bg-gradient-to-br ${update.color} p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="text-5xl mb-4 text-white">{update.icon}</div>
              <h3 className="text-xl font-bold text-white mb-2">{update.title}</h3>
              <p className="text-white/90">{update.description}</p>
            </div>
          ))}
        </div>
      </div>
      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-white">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500">Fonctionnalités</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`text-4xl mb-4 bg-gradient-to-r ${feature.color} bg-clip-text text-transparent`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">{feature.title}</h3>
              <p className="text-blue-100 mb-4">{feature.description}</p>
              <Link href={feature.href}>
                <span className="text-blue-300 hover:text-blue-200 transition-colors flex items-center">
                  En savoir plus
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </Link>
            </div>
          ))}
        </div>
      </div>

   

      {/* Footer */}
      <footer className="bg-black/30 backdrop-blur-md py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-blue-200">© 2024 One Piece Card Game - Tous droits réservés</p>
          <p className="text-blue-300 mt-2">Ce site n'est pas affilié à Bandai Namco ou à Eiichiro Oda</p>
        </div>
      </footer>
    </div>
  )
}
