'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

export default function LoadingPage() {
  const [progress, setProgress] = useState(0)
  const [currentText, setCurrentText] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  const loadingTexts = [
    "Préparation du voyage...",
    "Chargement des cartes...",
    "Connexion au Grand Line...",
    "Préparation de l'équipage...",
    "Démarrage de l'aventure..."
  ]

  useEffect(() => {
    // Animation de progression
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          setIsComplete(true)
          return 100
        }
        return prev + 2
      })
    }, 50)

    // Changement de texte
    const textInterval = setInterval(() => {
      setCurrentText(prev => (prev + 1) % loadingTexts.length)
    }, 800)

    return () => {
      clearInterval(progressInterval)
      clearInterval(textInterval)
    }
  }, [])

  useEffect(() => {
    if (isComplete) {
      // Rediriger vers la page principale après 1 seconde
      const timer = setTimeout(() => {
        window.location.href = '/home'
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isComplete])

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center overflow-hidden">
      {/* Fond animé avec vagues */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('/images/waves.png')] bg-cover bg-center opacity-20 animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-purple-500/10" />
      </div>

      {/* Contenu principal */}
      <div className="relative z-10 text-center">
        {/* Logo animé */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8"
        >
          <div className="relative w-32 h-32 mx-auto mb-6">
            <Image
              src="/images/straw-hat.png"
              alt="Straw Hat"
              fill
              className="object-contain animate-bounce"
              priority
            />
            {/* Effet de lueur */}
            <div className="absolute inset-0 bg-yellow-400/30 rounded-full blur-xl animate-pulse" />
          </div>
        </motion.div>

        {/* Titre */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-4xl md:text-6xl font-bold text-white mb-4"
        >
          <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
            Mugiwara TCG
          </span>
        </motion.h1>

        {/* Sous-titre */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-lg md:text-xl text-white/80 mb-8"
        >
          One Piece Card Game
        </motion.p>

        {/* Barre de progression */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "100%", opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="w-80 md:w-96 mx-auto mb-6"
        >
          <div className="bg-white/20 rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </motion.div>

        {/* Texte de chargement */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="h-8 flex items-center justify-center"
        >
          <AnimatePresence mode="wait">
            <motion.p
              key={currentText}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-white/90 text-lg"
            >
              {loadingTexts[currentText]}
            </motion.p>
          </AnimatePresence>
        </motion.div>

        {/* Pourcentage */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.8 }}
          className="mt-4"
        >
          <span className="text-white/70 text-sm">
            {progress}%
          </span>
        </motion.div>

        {/* Message de fin */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="mt-6"
            >
              <div className="bg-green-500/20 border border-green-400/30 rounded-lg px-4 py-2">
                <p className="text-green-300 font-medium">
                  🎉 Prêt pour l&apos;aventure !
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Éléments décoratifs */}
      <div className="absolute top-10 left-10 opacity-20">
        <Image src="/images/jolly-roger.png" alt="" width={60} height={60} />
      </div>
      <div className="absolute top-20 right-10 opacity-20">
        <Image src="/images/treasure-chest.png" alt="" width={50} height={50} />
      </div>
      <div className="absolute bottom-20 left-20 opacity-20">
        <Image src="/images/mini-merry.png" alt="" width={40} height={40} />
      </div>
      <div className="absolute bottom-10 right-20 opacity-20">
        <Image src="/images/thousand-sunny.png" alt="" width={45} height={45} />
      </div>

      {/* Particules flottantes */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-yellow-400/30 rounded-full"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + (i % 2) * 40}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 2 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  )
}
