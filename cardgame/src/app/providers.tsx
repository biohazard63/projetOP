'use client'

import { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useCallback, 
  useMemo, 
  useTransition,
  Suspense,
  startTransition,
  use
} from 'react'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/react'

// Types pour la configuration des providers
interface ProvidersConfig {
  enableAnalytics: boolean
  enableSpeedInsights: boolean
  enableToaster: boolean
  enableErrorBoundary: boolean
  enablePerformanceMonitoring: boolean
}

interface ProvidersContextType {
  config: ProvidersConfig
  updateConfig: (newConfig: Partial<ProvidersConfig>) => void
  isInitialized: boolean
  error: Error | null
  clearError: () => void
}

// Configuration par défaut
const defaultConfig: ProvidersConfig = {
  enableAnalytics: process.env.NODE_ENV === 'production',
  enableSpeedInsights: process.env.NODE_ENV === 'production',
  enableToaster: true,
  enableErrorBoundary: true,
  enablePerformanceMonitoring: process.env.NODE_ENV === 'production'
}

// Contexte pour les providers
const ProvidersContext = createContext<ProvidersContextType | null>(null)

// Hook personnalisé pour utiliser le contexte des providers
export function useProviders() {
  const context = useContext(ProvidersContext)
  if (!context) {
    throw new Error('useProviders must be used within a Providers component')
  }
  return context
}

// Composant pour la gestion des erreurs
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<Error | null>(null)
  const [isTransitioning, startErrorTransition] = useTransition()

  const handleError = useCallback((error: Error) => {
    startErrorTransition(() => {
      setError(error)
      console.error('Application error:', error)
    })
  }, [])

  const clearError = useCallback(() => {
    startErrorTransition(() => {
      setError(null)
    })
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="max-w-md w-full mx-auto p-6">
          <div className="bg-white rounded-xl shadow-2xl p-6 border border-red-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-xl">⚠️</span>
              </div>
                             <div>
                 <h2 className="text-lg font-semibold text-gray-900">Erreur d&apos;application</h2>
                 <p className="text-sm text-gray-600">Une erreur inattendue s&apos;est produite</p>
               </div>
            </div>
            
            <div className="bg-red-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800 font-mono break-all">
                {error.message}
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={clearError}
                disabled={isTransitioning}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50"
              >
                {isTransitioning ? 'Rechargement...' : 'Réessayer'}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200"
              >
                Recharger
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundaryWrapper onError={handleError}>
      {children}
    </ErrorBoundaryWrapper>
  )
}

// Wrapper pour la gestion des erreurs
function ErrorBoundaryWrapper({ 
  children, 
  onError 
}: { 
  children: React.ReactNode
  onError: (error: Error) => void 
}) {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      onError(new Error(event.reason?.message || 'Promise rejection'))
    }

    const handleError = (event: ErrorEvent) => {
      onError(new Error(event.message))
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [onError])

  return <>{children}</>
}

// Composant pour le monitoring des performances
function PerformanceMonitor() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Monitoring du temps de chargement
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming
            console.log('Page load time:', navEntry.loadEventEnd - navEntry.loadEventStart, 'ms')
          }
        }
      })

      observer.observe({ entryTypes: ['navigation'] })

      return () => observer.disconnect()
    }
  }, [])

  return null
}

// Composant pour l'initialisation des providers
function ProvidersInitializer({ 
  children, 
  config 
}: { 
  children: React.ReactNode
  config: ProvidersConfig 
}) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const initializeProviders = async () => {
      try {
        // Initialisation asynchrone des providers
        await new Promise(resolve => setTimeout(resolve, 100))
        
                 // Vérification de la disponibilité des APIs
         if (config.enableAnalytics && typeof window !== 'undefined') {
           // Initialisation des analytics
           console.log('Analytics initialized')
         }

        setIsInitialized(true)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Initialization failed'))
      }
    }

    initializeProviders()
  }, [config])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur d'initialisation</h2>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    )
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Initialisation...</h2>
          <p className="text-gray-600">Chargement des services</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Composant principal Providers
export function Providers({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ProvidersConfig>(defaultConfig)
  const [isTransitioning, startConfigTransition] = useTransition()

  const updateConfig = useCallback((newConfig: Partial<ProvidersConfig>) => {
    startConfigTransition(() => {
      setConfig(prev => ({ ...prev, ...newConfig }))
    })
  }, [])

  const contextValue = useMemo(() => ({
    config,
    updateConfig,
    isInitialized: true,
    error: null,
    clearError: () => {}
  }), [config, updateConfig])

  return (
    <ProvidersContext.Provider value={contextValue}>
      <ErrorBoundary>
        <ProvidersInitializer config={config}>
          <SessionProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                </div>
              }>
                {children}
              </Suspense>

              {/* Providers conditionnels */}
              {config.enableToaster && (
                <Toaster
                  position="top-right"
                  richColors
                  closeButton
                  duration={4000}
                  toastOptions={{
                    style: {
                      background: 'hsl(var(--background))',
                      color: 'hsl(var(--foreground))',
                      border: '1px solid hsl(var(--border))'
                    }
                  }}
                />
              )}

                             {config.enableAnalytics && <Analytics />}
               {config.enablePerformanceMonitoring && <PerformanceMonitor />}
            </ThemeProvider>
          </SessionProvider>
        </ProvidersInitializer>
      </ErrorBoundary>
    </ProvidersContext.Provider>
  )
}

// Hook pour accéder à la configuration des providers
export function useProvidersConfig() {
  const { config, updateConfig } = useProviders()
  return { config, updateConfig }
}

// Hook pour vérifier si un provider est activé
export function useProviderEnabled(provider: keyof ProvidersConfig) {
  const { config } = useProviders()
  return config[provider]
}

// Composant pour afficher le statut des providers
export function ProvidersStatus() {
  const { config } = useProviders()
  
  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl shadow-lg p-3">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Statut des services</h3>
        <div className="space-y-1">
          {Object.entries(config).map(([key, enabled]) => (
            <div key={key} className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-xs text-gray-600 capitalize">
                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 