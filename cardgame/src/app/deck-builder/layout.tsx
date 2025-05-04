import React from 'react'
import RootLayout from '../layout'

export default function DeckBuilderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RootLayout variant="deck-builder">
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden pt-16">
        {/* Fond avec effet de guerre */}
        <div className="fixed inset-0 top-16 bg-[url('/images/deck/marineford-war.png')] bg-cover bg-center opacity-20"></div>

        {/* Effet d'explosion animé */}
        <div className="fixed inset-0 top-16 bg-[url('/images/deck/explosion.png')] bg-repeat-x bg-bottom opacity-10 animate-pulse"></div>

        {/* Effet Haki */}
        <div className="fixed inset-0 top-16 pointer-events-none">
          {/* Flash de Haki en haut */}
          <div className="absolute top-0 right-0 w-96 h-96 opacity-20">
            <div className="w-full h-full bg-[url('/images/deck/haki-flash.png')] bg-contain bg-no-repeat animate-pulse"></div>
          </div>

          {/* Flash de Haki en bas */}
          <div className="absolute bottom-0 left-0 w-96 h-96 opacity-20 rotate-180">
            <div className="w-full h-full bg-[url('/images/deck/haki-flash.png')] bg-contain bg-no-repeat animate-pulse" style={{ animationDelay: '-1.5s' }}></div>
          </div>

          {/* Épées de Zoro */}
          <div className="absolute top-[20%] left-[5%] w-32 h-32 opacity-15">
            <div className="w-full h-full bg-[url('/images/swords.png')] bg-contain bg-no-repeat rotate-[-45deg] hover:rotate-[-30deg] transition-transform duration-500"></div>
          </div>

          {/* Jolly Roger */}
          <div className="absolute top-[10%] right-[10%] w-40 h-40 opacity-15">
            <div className="w-full h-full bg-[url('/images/jolly-roger.png')] bg-contain bg-no-repeat animate-float-slow rotate-animation"></div>
          </div>

          {/* Effets de combat */}
          <div className="absolute inset-0">
            {/* Particules de Haki */}
            <div className="absolute w-full h-full">
              <div className="haki-particles"></div>
            </div>

            {/* Éclairs de combat */}
            <div className="absolute top-0 right-0 w-full h-96 opacity-10">
              <div className="w-full h-full bg-[url('/images/lightning.png')] bg-repeat animate-lightning"></div>
            </div>
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