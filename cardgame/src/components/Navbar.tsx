'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

const navigation = [
  { name: 'Accueil', href: '/' },
  { name: 'Mes Decks', href: '/decks' },
  { name: 'Deck Builder', href: '/deck-builder' },
  { name: 'Boosters', href: '/booster-opening' },
  { name: 'Collection', href: '/collection' },
]

export function Navbar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const isLoading = status === 'loading'
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 justify-between items-center">
          {/* Logo ou titre */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-bold text-indigo-600">
              One Piece TCG
            </Link>
          </div>

          {/* Navigation desktop */}
          <div className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'inline-flex items-center px-1 pt-1 text-sm font-medium',
                  pathname === item.href
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Bouton menu mobile */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Auth section desktop */}
          <div className="hidden md:flex items-center space-x-4">
            {isLoading ? (
              <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
            ) : session ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  Bonjour, {session.user?.name || 'Joueur'}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  Déconnexion
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Connexion
              </Link>
            )}
          </div>
        </div>

        {/* Menu mobile */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'block px-3 py-2 rounded-md text-base font-medium',
                    pathname === item.href
                      ? 'text-indigo-600 bg-indigo-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  )}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              {!isLoading && !session && (
                <Link
                  href="/login"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Connexion
                </Link>
              )}
              {!isLoading && session && (
                <div className="px-3 py-2">
                  <span className="block text-sm text-gray-700">
                    Bonjour, {session.user?.name || 'Joueur'}
                  </span>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false)
                      signOut({ callbackUrl: '/' })
                    }}
                    className="mt-1 text-sm font-medium text-gray-500 hover:text-gray-700"
                  >
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
} 