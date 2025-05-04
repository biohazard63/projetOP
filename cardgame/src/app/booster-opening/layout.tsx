import React from 'react'
import RootLayout from '../layout'

export default function BoosterOpeningLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RootLayout variant="ocean">
      <div className="min-h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-indigo-950 text-white relative overflow-hidden pt-16">
        {/* Fond océanique avec vagues */}
        <div className="fixed inset-0 top-16 bg-[url('/images/ocean-bg.png')] bg-cover opacity-30"></div>
        
        {/* Vagues dynamiques */}
        <div className="fixed inset-0 top-16 pointer-events-none">
          <div className="absolute bottom-0 w-full h-64">
            <div className="wave-animation bg-[url('/images/waves.png')] bg-repeat-x w-[200%] h-full opacity-20"></div>
            <div className="wave-animation bg-[url('/images/waves.png')] bg-repeat-x w-[200%] h-full opacity-15" style={{ animationDelay: '-5s', animationDuration: '15s' }}></div>
          </div>
        </div>

       

        {/* Éléments décoratifs */}
        <div className="fixed inset-0 top-16 pointer-events-none">
          {/* Thousand Sunny au centre avec animation améliorée */}
          <div className="absolute bottom-0 left-[90%] transform -translate-x-1/2 w-[1000px] h-[800px] opacity-25">
            <div className="w-full h-full bg-[url('/images/thousand-sunny.png')] bg-contain bg-no-repeat bg-center animate-float-slow hover:scale-105 transition-transform duration-700"></div>
          </div>

          {/* Mini Merry à gauche avec animation de navigation */}
          <div className="absolute top-[61%] left-[5%] w-64 h-64 opacity-30">
            <div className="w-full h-full bg-[url('/images/mini-merry.png')] bg-contain bg-no-repeat animate-float transform hover:translate-x-4 transition-transform duration-1000"></div>
          </div>

          {/* Jolly Roger en haut à droite avec rotation */}
          <div className="absolute top-20 left-[10%] w-40 h-40 opacity-25">
            <div className="w-full h-full bg-[url('/images/jolly-roger.png')] bg-contain bg-no-repeat animate-float-slow rotate-animation hover:scale-110 transition-transform duration-500"></div>
          </div>

        

        
        </div>

        {/* Effet de profondeur océanique avec dégradé amélioré */}
        <div className="fixed inset-0 top-16 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 via-blue-800/20 to-indigo-950/30"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.3)_100%)]"></div>
        </div>

        {/* Particules dorées */}
        <div className="fixed inset-0 top-16 pointer-events-none">
          <div className="treasure-particles"></div>
        </div>

        {/* Contenu principal avec effet de verre */}
        <div className="relative z-10">
          <div className="container mx-auto px-4 py-8">
            <div className="glass-effect rounded-xl p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </RootLayout>
  )
} 