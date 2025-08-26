'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ExternalLink } from 'lucide-react'

export default function PWAAuthHelper() {
  const { status } = useSession()
  const [isPWA, setIsPWA] = useState(false)
  const [showHelper, setShowHelper] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return
    
    // Détecter si on est dans une PWA
    const isInPWA = window.matchMedia('(display-mode: standalone)').matches ||
                   (window.navigator as { standalone?: boolean }).standalone === true ||
                   document.referrer.includes('android-app://')

    setIsPWA(isInPWA)

    // Si on est en PWA et pas connecté, montrer l'aide après 3 secondes
    if (isInPWA && status === 'unauthenticated') {
      const timer = setTimeout(() => {
        setShowHelper(true)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [status, isClient])

  const openInBrowser = () => {
    // Ouvrir dans le navigateur par défaut
    const currentUrl = window.location.href
    window.open(currentUrl, '_system')
  }

  const retryAuth = () => {
    // Recharger la page pour réessayer l'auth
    window.location.reload()
  }

  if (!isPWA || !showHelper || status === 'authenticated') {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="text-amber-500 h-6 w-6" />
          <h3 className="text-lg font-semibold">Problème de connexion</h3>
        </div>
        
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Il semble y avoir un problème avec l&apos;authentification dans l&apos;application. 
            Cela peut arriver avec les connexions Google sur mobile.
          </p>

        <div className="space-y-3">
          <Button 
            onClick={retryAuth}
            className="w-full"
            variant="outline"
          >
            Réessayer la connexion
          </Button>
          
          <Button 
            onClick={openInBrowser}
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ouvrir dans le navigateur
          </Button>
          
          <button
            onClick={() => setShowHelper(false)}
            className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
