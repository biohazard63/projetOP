'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useTransition } from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { Moon, Sun, Palette, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

// Types pour les thèmes One Piece
type OnePieceTheme = 'default' | 'impel-down' | 'thousand-sunny' | 'marineford' | 'wano' | 'skypiea'

interface ThemeContextType {
  currentTheme: OnePieceTheme
  setTheme: (theme: OnePieceTheme) => void
  isTransitioning: boolean
  availableThemes: OnePieceTheme[]
  themeConfig: ThemeConfig
}

interface ThemeConfig {
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
  }
  animations: {
    background: string
    particles: string
  }
}

// Configuration des thèmes One Piece
const themeConfigs: Record<OnePieceTheme, ThemeConfig> = {
  default: {
    name: 'Classique',
    description: 'Thème par défaut One Piece',
    icon: Sparkles,
    colors: {
      primary: 'hsl(15 89% 55%)',
      secondary: 'hsl(210 40% 96%)',
      accent: 'hsl(43 74% 66%)',
      background: 'hsl(0 0% 100%)',
      surface: 'hsl(0 0% 98%)'
    },
    animations: {
      background: 'animate-pulse-slow',
      particles: 'animate-float'
    }
  },
  'impel-down': {
    name: 'Impel Down',
    description: 'Thème sombre et mystérieux',
    icon: Moon,
    colors: {
      primary: 'hsl(0 84% 60%)',
      secondary: 'hsl(217 32% 17%)',
      accent: 'hsl(15 89% 55%)',
      background: 'hsl(222 84% 5%)',
      surface: 'hsl(217 32% 17%)'
    },
    animations: {
      background: 'animate-lightning',
      particles: 'animate-chains'
    }
  },
  'thousand-sunny': {
    name: 'Thousand Sunny',
    description: 'Thème marin et ensoleillé',
    icon: Sun,
    colors: {
      primary: 'hsl(43 74% 66%)',
      secondary: 'hsl(200 100% 85%)',
      accent: 'hsl(15 89% 55%)',
      background: 'hsl(200 100% 95%)',
      surface: 'hsl(200 100% 90%)'
    },
    animations: {
      background: 'animate-wave',
      particles: 'animate-float-slow'
    }
  },
  marineford: {
    name: 'Marineford',
    description: 'Thème militaire et épique',
    icon: Palette,
    colors: {
      primary: 'hsl(0 0% 20%)',
      secondary: 'hsl(0 0% 90%)',
      accent: 'hsl(15 89% 55%)',
      background: 'hsl(0 0% 95%)',
      surface: 'hsl(0 0% 98%)'
    },
    animations: {
      background: 'animate-pulse-slow',
      particles: 'animate-float'
    }
  },
  wano: {
    name: 'Wano',
    description: 'Thème japonais traditionnel',
    icon: Sparkles,
    colors: {
      primary: 'hsl(0 84% 60%)',
      secondary: 'hsl(43 74% 66%)',
      accent: 'hsl(15 89% 55%)',
      background: 'hsl(0 0% 100%)',
      surface: 'hsl(0 0% 98%)'
    },
    animations: {
      background: 'animate-float-slow',
      particles: 'animate-pulse-slow'
    }
  },
  skypiea: {
    name: 'Skypiea',
    description: 'Thème céleste et mystique',
    icon: Sparkles,
    colors: {
      primary: 'hsl(200 100% 70%)',
      secondary: 'hsl(260 100% 85%)',
      accent: 'hsl(43 74% 66%)',
      background: 'hsl(200 100% 95%)',
      surface: 'hsl(200 100% 90%)'
    },
    animations: {
      background: 'animate-float',
      particles: 'animate-wave'
    }
  }
}

// Contexte pour les thèmes One Piece
const OnePieceThemeContext = createContext<ThemeContextType | null>(null)

// Hook personnalisé pour utiliser le contexte des thèmes
export function useOnePieceTheme() {
  const context = useContext(OnePieceThemeContext)
  if (!context) {
    throw new Error('useOnePieceTheme must be used within a OnePieceThemeProvider')
  }
  return context
}

// Composant pour le sélecteur de thème
function ThemeSelector() {
  const { currentTheme, setTheme, isTransitioning, availableThemes, themeConfig } = useOnePieceTheme()
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Ne pas afficher sur certaines pages
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
  const shouldHide = [
    '/loading',
    '/game',
    '/deck-builder',
    '/booster-opening'
  ].some(path => pathname.startsWith(path))
  
  const handleThemeChange = useCallback((theme: OnePieceTheme) => {
    setTheme(theme)
  }, [setTheme])

  if (!isClient || shouldHide) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100]">
      <div className="relative group">
        <button
          className={cn(
            "p-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-600",
            "text-white shadow-lg hover:shadow-xl transition-all duration-300",
            "hover:scale-110 active:scale-95",
            isTransitioning && "animate-pulse"
          )}
          aria-label="Changer de thème"
        >
          <themeConfig.icon className="w-5 h-5" />
        </button>
        
        {/* Menu déroulant des thèmes */}
        <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-xl border border-orange-200 rounded-xl shadow-2xl p-2 min-w-[200px]">
            <div className="text-xs font-medium text-gray-500 px-3 py-2 border-b border-gray-200">
              Thèmes One Piece
            </div>
            <div className="space-y-1 py-2">
              {availableThemes.map((theme) => {
                const config = themeConfigs[theme]
                const Icon = config.icon
                const isActive = theme === currentTheme
                
                return (
                  <button
                    key={theme}
                    onClick={() => handleThemeChange(theme)}
                    disabled={isTransitioning}
                    className={cn(
                      "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                      "hover:bg-orange-50 hover:text-orange-700",
                      isActive 
                        ? "bg-orange-100 text-orange-700 font-medium" 
                        : "text-gray-700",
                      isTransitioning && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{config.name}</div>
                      <div className="text-xs text-gray-500">{config.description}</div>
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



// Provider principal pour les thèmes One Piece
function OnePieceThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<OnePieceTheme>('default')
  const [isTransitioning, startTransition] = useTransition()
  const [mounted, setMounted] = useState(false)

  // Gestion du montage côté client
  useEffect(() => {
    setMounted(true)
    
    // Récupérer le thème sauvegardé
    const savedTheme = localStorage.getItem('one-piece-theme') as OnePieceTheme
    if (savedTheme && themeConfigs[savedTheme]) {
      setCurrentTheme(savedTheme)
    }
  }, [])

  const setTheme = useCallback((theme: OnePieceTheme) => {
    if (!themeConfigs[theme]) return
    
    startTransition(() => {
      setCurrentTheme(theme)
      localStorage.setItem('one-piece-theme', theme)
      
      // Appliquer les variables CSS du thème
      const config = themeConfigs[theme]
      document.documentElement.style.setProperty('--theme-primary', config.colors.primary)
      document.documentElement.style.setProperty('--theme-secondary', config.colors.secondary)
      document.documentElement.style.setProperty('--theme-accent', config.colors.accent)
      document.documentElement.style.setProperty('--theme-background', config.colors.background)
      document.documentElement.style.setProperty('--theme-surface', config.colors.surface)
    })
  }, [])

  const contextValue = useMemo(() => ({
    currentTheme,
    setTheme,
    isTransitioning,
    availableThemes: Object.keys(themeConfigs) as OnePieceTheme[],
    themeConfig: themeConfigs[currentTheme]
  }), [currentTheme, setTheme, isTransitioning])

  if (!mounted) {
    return <div className="min-h-screen bg-gray-50" />
  }

  return (
    <OnePieceThemeContext.Provider value={contextValue}>
      <div className={cn(
        "min-h-screen transition-all duration-500 ease-in-out",
        isTransitioning && "animate-pulse"
      )}>
        {children}
   </div>
    </OnePieceThemeContext.Provider>
  )
}

// Composant principal ThemeProvider
export function ThemeProvider({ 
  children, 
  ...props 
}: React.PropsWithChildren<{ [key: string]: unknown }>) {
  return (
    <NextThemesProvider 
      attribute="class" 
      defaultTheme="system" 
      enableSystem 
      disableTransitionOnChange
      {...props}
    >
      <OnePieceThemeProvider>
        {children}
      </OnePieceThemeProvider>
    </NextThemesProvider>
  )
}

// Hook pour obtenir les couleurs du thème actuel
export function useThemeColors() {
  const { themeConfig } = useOnePieceTheme()
  return themeConfig.colors
}

// Hook pour obtenir les animations du thème actuel
export function useThemeAnimations() {
  const { themeConfig } = useOnePieceTheme()
  return themeConfig.animations
}

// Composant pour prévisualiser un thème
export function ThemePreview({ theme }: { theme: OnePieceTheme }) {
  const config = themeConfigs[theme]
  const Icon = config.icon
  
  return (
    <div 
      className="p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-orange-500 transition-colors duration-300 cursor-pointer"
      style={{
        background: `linear-gradient(135deg, ${config.colors.background}, ${config.colors.surface})`
      }}
    >
      <div className="flex items-center space-x-3">
        <Icon className="w-6 h-6 text-orange-500" />
        <div>
          <h3 className="font-medium text-gray-900">{config.name}</h3>
          <p className="text-sm text-gray-600">{config.description}</p>
        </div>
      </div>
      <div className="mt-3 flex space-x-2">
        <div 
          className="w-4 h-4 rounded-full" 
          style={{ backgroundColor: config.colors.primary }}
        />
        <div 
          className="w-4 h-4 rounded-full" 
          style={{ backgroundColor: config.colors.secondary }}
        />
        <div 
          className="w-4 h-4 rounded-full" 
          style={{ backgroundColor: config.colors.accent }}
        />
      </div>
    </div>
  )
} 