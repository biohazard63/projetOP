import React from 'react'
import RootLayout from '../layout'

export default function DecksLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RootLayout variant="deck-builder">
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden pt-16">
        {/* Fond avec effet de guerre */}
        <div className="fixed inset-0 top-16 bg-[url('/images/deck/marineford-war.png')] bg-cover bg-center opacity-15"></div>

        {/* Effet de combat */}
        <div className="fixed inset-0 top-16 pointer-events-none">
          {/* Éclairs de combat */}
          <div className="absolute top-0 right-0 w-full h-96 opacity-10">
            <div className="w-full h-full bg-[url('/images/lightning.png')] bg-repeat animate-lightning"></div>
          </div>

          {/* Épées croisées */}
          <div className="absolute top-[10%] right-[5%] w-40 h-40 opacity-20">
            <div className="w-full h-full bg-[url('/images/swords.png')] bg-contain bg-no-repeat rotate-45 hover:rotate-[60deg] transition-transform duration-500"></div>
          </div>

          {/* Jolly Roger flottant */}
          <div className="absolute bottom-[10%] left-[5%] w-32 h-32 opacity-20">
            <div className="w-full h-full bg-[url('/images/jolly-roger.png')] bg-contain bg-no-repeat animate-float-slow"></div>
          </div>

          {/* Effet de Haki */}
          <div className="absolute inset-0">
            {/* Flash de Haki */}
            <div className="absolute top-0 left-0 w-96 h-96 opacity-10">
              <div className="w-full h-full bg-[url('/images/deck/haki-flash.png')] bg-contain bg-no-repeat animate-pulse"></div>
            </div>
            <div className="absolute bottom-0 right-0 w-96 h-96 opacity-10 rotate-180">
              <div className="w-full h-full bg-[url('/images/deck/haki-flash.png')] bg-contain bg-no-repeat animate-pulse" style={{ animationDelay: '-1.5s' }}></div>
            </div>
          </div>

          {/* Particules de Haki */}
          <div className="absolute w-full h-full">
            <div className="haki-particles"></div>
          </div>
        </div>

        {/* Effet de profondeur avec dégradé */}
        <div className="fixed inset-0 top-16 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/40 via-transparent to-gray-900/60"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]"></div>
        </div>

        {/* Contenu principal avec effet de verre */}
        <div className="relative z-10">
          <div className="container mx-auto px-4 py-8">
            <div className="glass-effect rounded-xl">
              {children}
            </div>
          </div>
        </div>
      </div>
    </RootLayout>
  )
} 