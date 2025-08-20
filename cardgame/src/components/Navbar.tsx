'use client'

import { useEffect, useState, useTransition, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Menu, X, Anchor, Ship, Scroll, Book, Trophy, Sword, User, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

// Configuration de navigation avec métadonnées enrichies
const navigation = [
  { 
    name: 'Accueil', 
    href: '/home', 
    icon: Anchor,
    description: 'Retour à l\'accueil',
    badge: null
  },
  { 
    name: 'Mes Decks', 
    href: '/decks', 
    icon: Ship,
    description: 'Gérer vos decks',
    badge: null
  },
  { 
    name: 'Deck Builder', 
    href: '/deck-builder', 
    icon: Scroll,
    description: 'Créer un nouveau deck',
    badge: 'Nouveau'
  },
  { 
    name: 'Boosters', 
    href: '/booster-opening', 
    icon: Book,
    description: 'Ouvrir des boosters',
    badge: null
  },
  { 
    name: 'Collection', 
    href: '/collection', 
    icon: Trophy,
    description: 'Voir votre collection',
    badge: null
  },
  { 
    name: 'Jouer', 
    href: '/game', 
    icon: Sword,
    description: 'Lancer une partie',
    badge: null
  },
] as const

type NavbarProps = {
  variant?: 'default' | 'impel-down' | 'ocean' | 'deck-builder'
  className?: string
}

// Composant pour l'icône du logo avec animation
function LogoIcon() {
  return (
    <div className="relative group">
      <Image 
        src="/images/jolly-roger.png"
        alt="Logo One Piece TCG" 
        width={40}
        height={40}
        className="w-10 h-10 object-contain transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
      />
      <div className="absolute inset-0 bg-orange-500/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  )
}

// Composant pour les éléments de navigation
function NavItem({ 
  item, 
  isActive, 
  onClick 
}: { 
  item: typeof navigation[number]
  isActive: boolean
  onClick?: () => void
}) {
  const Icon = item.icon
  
  return (
    <Link
      href={item.href}
      onClick={onClick}
      role="menuitem"
      className={cn(
        "group relative flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300",
        "hover:scale-105 active:scale-95",
        isActive 
          ? "text-orange-500 bg-gradient-to-r from-orange-500/20 to-orange-600/20 shadow-lg shadow-orange-500/25" 
          : "text-white/90 hover:text-orange-400 hover:bg-white/5"
      )}
    >
      <Icon className={cn(
        "w-4 h-4 mr-2.5 transition-all duration-300",
        isActive ? "text-orange-500" : "text-white/70 group-hover:text-orange-400"
      )} />
      <span className="relative">
        {item.name}
        {item.badge && (
          <span className="absolute -top-2 -right-8 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full animate-pulse">
            {item.badge}
          </span>
        )}
      </span>
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent rounded-xl animate-pulse" />
      )}
    </Link>
  )
}

// Composant pour le bouton de menu mobile
function MobileMenuButton({ 
  isOpen, 
  onClick 
}: { 
  isOpen: boolean
  onClick: () => void 
}) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden relative p-2.5 rounded-xl text-white hover:bg-orange-500/20 transition-all duration-300 hover:scale-105 active:scale-95"
      aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
    >
      <div className="relative w-6 h-6">
        <span className={cn(
          "absolute inset-0 transition-all duration-300",
          isOpen ? "rotate-45 translate-y-0" : "-translate-y-1"
        )}>
          <X size={24} className={cn(
            "transition-opacity duration-300",
            isOpen ? "opacity-100" : "opacity-0"
          )} />
        </span>
        <span className={cn(
          "absolute inset-0 transition-all duration-300",
          isOpen ? "opacity-0" : "opacity-100"
        )}>
          <Menu size={24} />
        </span>
      </div>
    </button>
  )
}

// Composant pour l'état de chargement
function LoadingState() {
  return (
    <div className="flex items-center space-x-2">
      <div className="h-8 w-24 bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-lg animate-pulse" />
      <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" />
    </div>
  )
}

// Composant pour l'utilisateur connecté
function UserSection({ session }: { session: { user?: { name?: string | null } } }) {
  const [isPending, startTransition] = useTransition()
  
  const handleSignOut = useCallback(() => {
    startTransition(() => {
      signOut({ callbackUrl: '/home' })
    })
  }, [])

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/20">
        <User className="w-4 h-4 text-orange-400" />
        <span className="text-sm text-white/90">
          Bonjour, {session.user?.name || 'Pirate'}
        </span>
      </div>
      <button
        onClick={handleSignOut}
        disabled={isPending}
        className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25"
      >
        <LogOut className="w-4 h-4" />
        <span>{isPending ? 'Déconnexion...' : 'Déconnexion'}</span>
      </button>
    </div>
  )
}

// Composant pour le bouton de connexion
function LoginButton() {
  return (
    <Link
      href="/login"
      className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/25"
    >
      <User className="w-4 h-4" />
      <span>Connexion</span>
    </Link>
  )
}

export function Navbar({ variant = 'default', className }: NavbarProps) {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Gestion de l'état de chargement sans use()
  const isLoading = status === 'loading'
  
  // (supprimé) Mémorisation non utilisée de l'élément actif

  const handleMenuToggle = useCallback(() => {
    setIsMenuOpen(prev => !prev)
  }, [])

  const handleNavItemClick = useCallback(() => {
    setIsMenuOpen(false)
  }, [])

  // Gestion du montage côté client
  useEffect(() => {
    setMounted(true)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <nav role="navigation" aria-label="Navigation principale" data-variant={variant} className={cn(
      "fixed top-0 left-0 right-0 z-50 w-full",
      "bg-black/95 backdrop-blur-xl border-b border-orange-500/30",
      "shadow-2xl shadow-black/50",
      className
    )}>
      <div className="container mx-auto px-4">
        <div className="flex h-16 justify-between items-center">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/home" className="flex items-center space-x-3 group">
              <LogoIcon />
              <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
                One Piece TCG
              </span>
            </Link>
          </div>

          {/* Navigation desktop */}
          <div className="hidden md:flex items-center space-x-2" role="menubar" aria-label="Liens principaux">
            {navigation.map((item) => (
              <NavItem
                key={item.href}
                item={item}
                isActive={pathname === item.href}
              />
            ))}
          </div>

          {/* Bouton menu mobile */}
          <MobileMenuButton isOpen={isMenuOpen} onClick={handleMenuToggle} />

          {/* Section authentification desktop */}
          <div className="hidden md:flex items-center">
            {isLoading ? (
              <LoadingState />
            ) : session ? (
              <UserSection session={session} />
            ) : (
              <LoginButton />
            )}
          </div>
        </div>

        {/* Menu mobile avec animation améliorée */}
        <div id="mobile-nav" aria-hidden={!isMenuOpen} className={cn(
          "md:hidden overflow-hidden transition-all duration-300 ease-in-out",
          isMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="px-2 pt-2 pb-4 space-y-2 mb-4 rounded-xl bg-black/95 border border-orange-500/30 backdrop-blur-xl shadow-2xl">
            {navigation.map((item) => (
              <NavItem
                key={item.href}
                item={item}
                isActive={pathname === item.href}
                onClick={handleNavItemClick}
              />
            ))}
            
            {/* Section authentification mobile */}
            <div className="pt-2 border-t border-orange-500/20">
              {!isLoading && !session && (
                <div className="px-2">
                  <LoginButton />
                </div>
              )}
              {!isLoading && session && (
                <div className="px-2 space-y-3">
                  <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/20">
                    <User className="w-4 h-4 text-orange-400" />
                    <span className="text-sm text-white/90">
                      Bonjour, {session.user?.name || 'Pirate'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false)
                      signOut({ callbackUrl: '/home' })
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/25"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Déconnexion</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
} 