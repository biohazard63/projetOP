'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Menu, X, Anchor, Ship, Scroll, Book, Trophy, Sword } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Accueil', href: '/home', icon: Anchor },
  { name: 'Mes Decks', href: '/decks', icon: Ship },
  { name: 'Deck Builder', href: '/deck-builder', icon: Scroll },
  { name: 'Boosters', href: '/booster-opening', icon: Book },
  { name: 'Collection', href: '/collection', icon: Trophy },
  { name: 'Jouer', href: '/game', icon: Sword },
]

type NavbarProps = {
  variant?: 'default' | 'impel-down' | 'ocean' | 'deck-builder'
}

const navbarVariants = {
  default: {
    nav: "backdrop-blur-lg bg-gradient-to-b from-[#1a1a1a]/80 to-[#1a1a1a]/60 shadow-lg border-b border-[#D84315]/20",
    link: "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-300 hover:bg-[#D84315]/10",
    activeLinkClass: "text-[#FF5722] bg-[#D84315]/20 shadow-inner shadow-[#D84315]/10",
    inactiveLinkClass: "text-white hover:text-[#FF5722]",
    mobileMenu: "backdrop-blur-lg bg-[#1a1a1a]/90 rounded-lg border border-[#D84315]/20",
    logo: "text-[#FF5722] hover:text-[#FF5722]/80",
    button: "bg-[#D84315] hover:bg-[#FF5722] text-white transition-colors duration-300"
  },
  "impel-down": {
    nav: "backdrop-blur-md bg-[#0B1120]/80 shadow-red-900/20 shadow-lg border-b border-red-900/30",
    link: "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:bg-red-900/20",
    activeLinkClass: "text-red-500 bg-red-900/30",
    inactiveLinkClass: "text-gray-300 hover:text-red-400",
    mobileMenu: "backdrop-blur-md bg-[#0B1120]/90 rounded-lg border border-red-900/30",
    logo: "text-red-500 hover:text-red-400",
    button: "bg-red-900 hover:bg-red-800 text-white transition-colors duration-300"
  },
  ocean: {
    nav: "backdrop-blur-md bg-gradient-to-b from-blue-900/80 via-blue-800/70 to-blue-900/60 shadow-lg border-b border-blue-400/30",
    link: "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-300",
    activeLinkClass: "text-yellow-400 bg-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]",
    inactiveLinkClass: "text-white hover:text-yellow-200",
    mobileMenu: "backdrop-blur-md bg-gradient-to-b from-blue-900/90 to-blue-800/90 rounded-lg border border-blue-400/30",
    logo: "text-yellow-400 hover:text-yellow-300",
    button: "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg hover:shadow-blue-500/50 transition-all duration-300"
  },
  "deck-builder": {
    nav: "backdrop-blur-lg bg-gradient-to-b from-gray-900/90 via-gray-800/80 to-gray-900/70 shadow-lg border-b border-yellow-500/20 relative overflow-hidden",
    link: "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-300 hover:bg-yellow-500/10 relative",
    activeLinkClass: "text-yellow-400 bg-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.3)]",
    inactiveLinkClass: "text-white hover:text-yellow-200",
    mobileMenu: "backdrop-blur-lg bg-gradient-to-b from-gray-900/95 to-gray-800/95 rounded-lg border border-yellow-500/20",
    logo: "text-yellow-400 hover:text-yellow-300",
    button: "bg-gradient-to-r from-yellow-600 to-red-600 hover:from-yellow-500 hover:to-red-500 text-white shadow-lg hover:shadow-yellow-500/30 transition-all duration-300"
  }
}

export function Navbar({ variant = 'default' }: NavbarProps) {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const isLoading = status === 'loading'
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const styles = navbarVariants[variant]

  if (!mounted) {
    return null
  }

  return (
    <nav className={cn(
      styles.nav,
      "fixed top-0 left-0 right-0 z-50 w-full"
    )}>
      {variant === 'deck-builder' && (
        <>
          {/* Effet de Haki */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
              <div className="w-full h-full bg-[url('/images/deck/haki-flash.png')] bg-contain bg-no-repeat animate-pulse"></div>
            </div>
            <div className="absolute bottom-0 left-0 w-64 h-64 opacity-10 rotate-180">
              <div className="w-full h-full bg-[url('/images/deck/haki-flash.png')] bg-contain bg-no-repeat animate-pulse" style={{ animationDelay: '-1.5s' }}></div>
            </div>
          </div>
          {/* Effet d'explosion */}
          <div className="absolute inset-0 bg-[url('/images/deck/explosion.png')] bg-repeat-x bg-bottom opacity-5 animate-pulse"></div>
        </>
      )}
      
      <div className="container mx-auto px-4">
        <div className="flex h-16 justify-between items-center relative z-10">
          {/* Logo avec effet de Haki pour le deck-builder */}
          <div className="flex-shrink-0 relative group">
            <Link 
              href="/home" 
              className="flex items-center space-x-2 relative"
            >
              <div className="relative overflow-hidden rounded-full">
                <img 
                  src="/images/jolly-roger.png"
                  alt="Logo" 
                  className={cn(
                    "w-10 h-10 object-contain transform transition-all duration-300",
                    "group-hover:scale-110"
                  )}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <span className={cn(
                "text-xl font-bold transition-all duration-300 group-hover:tracking-wider relative",
                styles.logo,
                "after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:transition-all after:duration-300 group-hover:after:w-full",
                variant === 'deck-builder' && "after:bg-yellow-500"
              )}>
                One Piece TCG
              </span>
            </Link>
          </div>

          {/* Navigation desktop avec effets de vague */}
          <div className="hidden lg:flex space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    styles.link,
                    "relative overflow-hidden group",
                    isActive ? styles.activeLinkClass : styles.inactiveLinkClass,
                    "hover:bg-blue-500/10"
                  )}
                >
                  <Icon className="w-4 h-4 mr-2 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                  <span className="relative z-10">{item.name}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-yellow-400/0 via-yellow-400 to-yellow-400/0"></div>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Bouton menu mobile avec effet de vague */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={cn(
                "p-2 rounded-lg transition-all duration-300 focus:outline-none",
                "hover:bg-blue-500/20",
                styles.inactiveLinkClass,
                "relative overflow-hidden"
              )}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-1000"></div>
            </button>
          </div>

          {/* Auth section desktop avec effets */}
          <div className="hidden lg:flex items-center space-x-4">
            {isLoading ? (
              <div className="h-8 w-20 bg-blue-400/20 animate-pulse rounded-lg"></div>
            ) : session ? (
              <div className="flex items-center space-x-4">
                <span className={cn(
                  "px-3 py-2 rounded-lg",
                  styles.inactiveLinkClass,
                  "bg-blue-500/10"
                )}>
                  Bonjour, {session.user?.name || 'Pirate'}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: '/home' })}
                  className={cn(
                    "px-4 py-2 rounded-lg",
                    styles.button,
                    "transform hover:scale-105 hover:shadow-lg"
                  )}
                >
                  Déconnexion
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className={cn(
                  "px-4 py-2 rounded-lg",
                  styles.button,
                  "transform hover:scale-105 hover:shadow-lg"
                )}
              >
                Connexion
              </Link>
            )}
          </div>
        </div>

        {/* Menu mobile avec animations de vague */}
        {isMenuOpen && (
          <div className="lg:hidden">
            <div className={cn(
              "px-2 pt-2 pb-3 space-y-1 mb-4 rounded-lg shadow-lg",
              styles.mobileMenu
            )}>
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center px-3 py-2 rounded-lg text-base font-medium transition-all duration-300',
                      'relative overflow-hidden group',
                      isActive ? styles.activeLinkClass : styles.inactiveLinkClass,
                      'hover:bg-blue-500/10'
                    )}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Icon className="w-5 h-5 mr-3 transition-transform group-hover:rotate-12" />
                    {item.name}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  </Link>
                )
              })}
              {!isLoading && !session && (
                <Link
                  href="/login"
                  className={cn(
                    "px-4 py-2 rounded-lg transition-all duration-300 w-full text-center",
                    styles.button,
                    "transform hover:scale-105"
                  )}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Connexion
                </Link>
              )}
              {!isLoading && session && (
                <div className="px-3 py-2 space-y-3">
                  <span className={cn(
                    "block px-3 py-2 rounded-lg",
                    styles.inactiveLinkClass,
                    "bg-blue-500/10"
                  )}>
                    Bonjour, {session.user?.name || 'Pirate'}
                  </span>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false)
                      signOut({ callbackUrl: '/home' })
                    }}
                    className={cn(
                      "w-full px-4 py-2 rounded-lg transition-all duration-300",
                      styles.button,
                      "transform hover:scale-105"
                    )}
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