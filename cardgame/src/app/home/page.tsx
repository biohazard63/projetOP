'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Ship, Scroll, Sword, Trophy, Package, Star, Globe, Search, Anchor } from 'lucide-react'

const features = [
  {
    title: 'Deck Builder',
    description: 'Créez vos decks de pirates légendaires et devenez le Roi des Pirates !',
    href: '/deck-builder',
    icon: Ship,
    color: 'from-[#D84315] to-[#FF5722]', // Rouge One Piece
  },
  {
    title: 'Ouverture de Boosters',
    description: 'Découvrez de nouveaux trésors dans des boosters virtuels avec des animations épiques.',
    href: '/booster-opening',
    icon: Package,
    color: 'from-[#1E88E5] to-[#2196F3]', // Bleu océan
  },
  {
    title: 'Mode de Jeu',
    description: 'Affrontez d\'autres pirates dans des duels épiques sur Grand Line !',
    href: '/game',
    icon: Sword,
    color: 'from-[#43A047] to-[#4CAF50]', // Vert Zoro
  },
  {
    title: 'Collection',
    description: 'Gérez votre collection de cartes comme un véritable trésor de pirate.',
    href: '/collection',
    icon: Trophy,
    color: 'from-[#8E24AA] to-[#9C27B0]', // Violet royal
  },
]

const updates = [
  {
    title: 'Réinitialisation des Données',
    description: "Suite à une attaque de la Marine, les données ont été temporairement perdues. L'application est de nouveau en ligne après maintenance. Créez un nouveau compte pour rejoindre l'aventure !",
    icon: Scroll,
    color: 'from-gray-700 to-gray-900',
  },
  {
    title: 'Effets Visuels Épiques',
    description: 'Nouvelles animations dignes des plus grands combats de One Piece pour les cartes ultra rares !',
    icon: Star,
    color: 'from-[#FFB300] to-[#FFC107]',
  },
  {
    title: 'Cartes Légendaires',
    description: 'Système amélioré pour les cartes ultra rares incluant les versions alternatives et promotionnelles.',
    icon: Trophy,
    color: 'from-[#8E24AA] to-[#9C27B0]',
  },
  {
    title: 'Traductions Den Den Mushi',
    description: 'Les effets et textes des cartes seront bientôt disponibles en français grâce à notre équipe de Den Den Mushi !',
    icon: Globe,
    color: 'from-[#43A047] to-[#4CAF50]',
  },
  {
    title: 'Vivre Card Detector',
    description: 'Nouvelle fonctionnalité pour traquer les cartes manquantes de votre collection.',
    icon: Search,
    color: 'from-[#D84315] to-[#FF5722]',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section avec animation de vagues */}
      <div className="relative overflow-hidden py-20">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center">
            <div className="relative inline-block mb-8">
              <div className="relative">
                <img 
                  src="/images/jolly-roger.png" 
                  alt="Jolly Roger" 
                  className="w-32 h-32 mx-auto animate-float-slow"
                />
                <div className="absolute inset-0 bg-gradient-radial from-yellow-500/30 to-transparent opacity-50 animate-pulse-slow"></div>
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white drop-shadow-glow">
              One Piece <span className="text-primary">Card Game</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto leading-relaxed">
              Embarquez à bord du Thousand Sunny et vivez une aventure légendaire à travers des duels de cartes épiques !
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <Link href="/booster-opening">
                <button className="button-one-piece text-lg px-8 py-4 bg-gradient-to-br from-primary to-primary/80 hover:scale-105 transform transition-all duration-300 shadow-lg hover:shadow-primary/50">
                  Ouvrir un Trésor
                </button>
              </Link>
              <Link href="/deck-builder">
                <button className="button-one-piece text-lg px-8 py-4 bg-gradient-to-br from-blue-600 to-blue-800 hover:scale-105 transform transition-all duration-300 shadow-lg hover:shadow-blue-500/50">
                  Préparer son Équipage
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Section des mises à jour */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="title-one-piece text-center mb-12">
          Journal du Nouveau Monde
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {updates.map((update, index) => {
            const Icon = update.icon
            return (
              <div
                key={index}
                className="card bg-gradient-to-br from-[#1a1a1a]/95 to-[#1a1a1a]/90 hover:from-[#1a1a1a] hover:to-[#1a1a1a]/95 border border-white/10 hover:border-white/20"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${update.color} mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{update.title}</h3>
                <p className="text-white/80">{update.description}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Section des fonctionnalités */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-center mb-12 text-white">
          <span className="relative">
            Votre Aventure Commence Ici
            <div className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Link
                key={index}
                href={feature.href}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1a1a1a]/95 to-[#1a1a1a]/90 p-6 border border-white/10 transition-all duration-300 hover:from-[#1a1a1a] hover:to-[#1a1a1a]/95 hover:scale-[1.02] hover:shadow-xl"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                     style={{ backgroundImage: `linear-gradient(to bottom right, ${feature.color.split(' ')[1]}, ${feature.color.split(' ')[3]})` }}></div>
                <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${feature.color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-white/80 mb-4">{feature.description}</p>
                <span className="text-primary group-hover:text-white transition-colors flex items-center text-sm">
                  Explorer
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Footer avec style One Piece */}
      <footer className="relative overflow-hidden py-16 mt-16">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent backdrop-blur-sm"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="relative inline-block mb-6">
            <img 
              src="/images/straw-hat.png" 
              alt="Chapeau de Paille" 
              className="w-20 h-20 mx-auto opacity-80 animate-float-slow"
            />
            <div className="absolute inset-0 bg-gradient-radial from-yellow-500/20 to-transparent opacity-30"></div>
          </div>
          <p className="text-white/80 text-lg mb-4">© 2024 One Piece Card Game - L'aventure continue</p>
          <p className="text-white/60">
            Ce site est un hommage créé par des fans, pour des fans.
            <br />
            One Piece est la propriété d'Eiichiro Oda et de Bandai Namco.
          </p>
        </div>
      </footer>
    </div>
  )
} 