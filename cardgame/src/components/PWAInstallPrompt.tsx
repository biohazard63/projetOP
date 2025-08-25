'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Vérifier si le navigateur supporte l'installation PWA
    const checkPWASupport = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      
      // Sur iOS, on ne peut pas installer de PWA via l'API
      if (isIOS) {
        setIsSupported(false)
        return
      }
      
      // Si déjà installé, ne pas afficher
      if (isStandalone) {
        setIsSupported(false)
        return
      }
      
      setIsSupported(true)
    }

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      
      // Vérifier si l'utilisateur a déjà refusé l'installation
      const hasRefused = localStorage.getItem('pwa-install-refused')
      if (!hasRefused && isSupported) {
        setShowPrompt(true)
      }
    }

    // Écouter l'événement appinstalled
    const handleAppInstalled = () => {
      setShowPrompt(false)
      setDeferredPrompt(null)
      console.log('PWA installée avec succès!')
    }

    checkPWASupport()
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [isSupported])

  const handleInstall = async () => {
    if (!deferredPrompt || !isSupported) {
      console.log('Installation PWA non supportée sur ce navigateur')
      setShowPrompt(false)
      return
    }

    try {
      // Afficher le prompt d'installation natif
      await deferredPrompt.prompt()

      // Attendre la réponse de l'utilisateur
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        console.log('Utilisateur a accepté l\'installation')
      } else {
        console.log('Utilisateur a refusé l\'installation')
        localStorage.setItem('pwa-install-refused', 'true')
      }
    } catch (error) {
      console.error('Erreur lors de l\'installation PWA:', error)
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-refused', 'true')
  }

  // Ne pas afficher si pas supporté ou pas de prompt
  if (!showPrompt || !isSupported) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80"
      >
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg shadow-2xl border border-orange-400/20 overflow-hidden">
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Smartphone className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg">
                    Installer Mugiwara TCG
                  </h3>
                  <p className="text-orange-100 text-sm mt-1">
                    Accède à l&apos;app depuis ton écran d&apos;accueil pour une expérience optimale
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 text-orange-100 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex space-x-3 mt-4">
              <button
                onClick={handleInstall}
                className="flex-1 bg-white text-orange-600 font-semibold py-2 px-4 rounded-md hover:bg-orange-50 transition-colors flex items-center justify-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Installer</span>
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-orange-100 hover:text-white transition-colors font-medium"
              >
                Plus tard
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
