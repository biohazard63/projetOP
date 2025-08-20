import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Metadata } from 'next'
import Image from 'next/image'

// Métadonnées pour le SEO
export const metadata: Metadata = {
  title: 'One Piece TCG - Jeu de Cartes à Collectionner',
  description: 'Découvrez l\'univers One Piece à travers notre jeu de cartes à collectionner. Ouvrez des boosters, construisez vos decks et affrontez d\'autres joueurs !',
  keywords: 'One Piece, TCG, jeu de cartes, collection, boosters, decks, anime, manga',
  authors: [{ name: 'One Piece TCG Team' }],
  creator: 'One Piece TCG',
  publisher: 'One Piece TCG',
  robots: 'index, follow',
  openGraph: {
    title: 'One Piece TCG - Jeu de Cartes à Collectionner',
    description: 'Découvrez l\'univers One Piece à travers notre jeu de cartes à collectionner',
    type: 'website',
    locale: 'fr_FR',
    siteName: 'One Piece TCG',
    images: [
      {
        url: '/images/banniere.png',
        width: 1200,
        height: 630,
        alt: 'One Piece TCG Banner'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'One Piece TCG - Jeu de Cartes à Collectionner',
    description: 'Découvrez l\'univers One Piece à travers notre jeu de cartes à collectionner',
    images: ['/images/banniere.png']
  },
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#f97316'
}

// Composant de chargement avec animations
function LoadingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50 flex items-center justify-center relative overflow-hidden">
      {/* Particules de fond animées */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-2 h-2 bg-orange-400 rounded-full animate-float opacity-60" />
        <div className="absolute top-20 right-20 w-3 h-3 bg-yellow-400 rounded-full animate-float-slow opacity-60" />
        <div className="absolute bottom-20 left-1/4 w-2 h-2 bg-red-400 rounded-full animate-float-slower opacity-60" />
        <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-orange-500 rounded-full animate-pulse opacity-80" />
        <div className="absolute bottom-10 right-1/3 w-2 h-2 bg-yellow-500 rounded-full animate-float opacity-60" />
      </div>

             {/* Vagues animées */}
       <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-blue-200/30 to-transparent">
         <div className="absolute inset-0 bg-gradient-to-t from-orange-500/20 to-transparent animate-pulse" />
       </div>

      {/* Contenu principal */}
      <div className="relative z-10 text-center">
        {/* Logo animé */}
        <div className="mb-8">
          <div className="relative inline-block">
            <Image 
              src="/images/jolly-roger.png"
              alt="One Piece TCG Logo"
              className="w-24 h-24 md:w-32 md:h-32 object-contain animate-bounce"
              width={128}
              height={128}
              
            />
            <div className="absolute inset-0 bg-orange-500/20 rounded-full animate-ping" />
          </div>
        </div>

        {/* Titre principal */}
        <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-orange-600 via-red-600 to-yellow-600 bg-clip-text text-transparent animate-pulse">
          One Piece TCG
        </h1>

        {/* Sous-titre */}
        <p className="text-lg md:text-xl text-gray-700 mb-8 max-w-md mx-auto">
          Découvrez l&apos;univers One Piece à travers notre jeu de cartes à collectionner
        </p>

        {/* Indicateur de chargement */}
        <div className="flex items-center justify-center space-x-2 mb-8">
          <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>

        {/* Barre de progression */}
        <div className="w-64 md:w-80 mx-auto mb-8">
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full animate-pulse" 
                 style={{ width: '75%' }} />
          </div>
        </div>

        {/* Message de chargement */}
        <div className="text-sm text-gray-600 animate-pulse">
          Chargement de l&apos;aventure...
        </div>

        {/* Éléments décoratifs */}
        <div className="absolute top-10 right-10 hidden md:block">
          <Image
            src="/images/straw-hat.png"
            alt="Straw Hat"
            width={64}
            height={64}
            className="w-16 h-16 object-contain animate-float opacity-60"
          />
        </div>

        <div className="absolute bottom-10 left-10 hidden md:block">
          <Image
            src="/images/treasure-chest.png"
            alt="Treasure Chest"
            width={64}
            height={64}
            className="w-16 h-16 object-contain animate-float-slow opacity-60"
          />
        </div>
      </div>

      {/* Overlay de transition */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
    </div>
  )
}

// Page racine avec Suspense
export default function RootPage() {
  // Redirection vers la page d'accueil
  redirect('/home')
}

// Configuration pour le rendu statique
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Configuration pour les performances
export const runtime = 'edge'
