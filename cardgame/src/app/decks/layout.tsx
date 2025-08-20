import React from 'react'

export default function DecksLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden pt-16">
      {/* Fond avec effet de guerre */}
      <div aria-hidden="true" className="fixed inset-0 top-16 bg-[url('/images/deck/marineford-war.png')] bg-cover bg-center opacity-15" />

      {/* Effet de combat */}
      <div aria-hidden="true" className="fixed inset-0 top-16 pointer-events-none">
        {/* Éclairs de combat */}
        <div className="absolute top-0 right-0 w-full h-96 opacity-10">
          <div className="w-full h-full bg-[url('/images/lightning.png')] bg-repeat animate-lightning" />
        </div>

        {/* Épées croisées */}
        <div className="absolute top-[10%] right-[5%] w-40 h-40 opacity-20">
          <div className="w-full h-full bg-[url('/images/swords.png')] bg-contain bg-no-repeat rotate-45 transition-transform duration-500" />
        </div>

        {/* Jolly Roger flottant */}
        <div className="absolute bottom-[10%] left-[5%] w-32 h-32 opacity-20">
          <div className="w-full h-full bg-[url('/images/jolly-roger.png')] bg-contain bg-no-repeat animate-float-slow" />
        </div>

        {/* Effet de Haki */}
        <div className="absolute inset-0">
          {/* Flash de Haki */}
          <div className="absolute top-0 left-0 w-96 h-96 opacity-10">
            <div className="w-full h-full bg-[url('/images/deck/haki-flash.png')] bg-contain bg-no-repeat animate-pulse" />
          </div>
          <div className="absolute bottom-0 right-0 w-96 h-96 opacity-10 rotate-180">
            <div className="w-full h-full bg-[url('/images/deck/haki-flash.png')] bg-contain bg-no-repeat animate-pulse" style={{ animationDelay: '-1.5s' }} />
          </div>
        </div>

        {/* Particules de Haki */}
        <div className="absolute w-full h-full">
          <div className="haki-particles" />
        </div>
      </div>

      {/* Effet de profondeur avec dégradé */}
      <div aria-hidden="true" className="fixed inset-0 top-16 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/40 via-transparent to-gray-900/60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />
      </div>

      {/* Contenu principal avec effet de verre */}
      <main className="relative z-10">
        <div className="container mx-auto px-4 py-8">
          <div className="glass-effect rounded-xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}