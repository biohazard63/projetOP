import React from 'react'

export default function BoosterOpeningLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-indigo-950 text-white relative overflow-hidden pt-16">
      {/* Fond océanique avec vagues (décoratif) */}
      <div aria-hidden="true" className="fixed inset-0 top-16 bg-[url('/images/ocean-bg.png')] bg-cover opacity-30" />

      {/* Vagues dynamiques (décoratif) */}
      <div aria-hidden="true" className="fixed inset-0 top-16 pointer-events-none">
        <div className="absolute bottom-0 w-full h-64">
          <div className="wave-animation bg-[url('/images/waves.png')] bg-repeat-x w-[200%] h-full opacity-20" />
          <div className="wave-animation bg-[url('/images/waves.png')] bg-repeat-x w-[200%] h-full opacity-15" style={{ animationDelay: '-5s', animationDuration: '15s' }} />
        </div>
      </div>

      {/* Éléments décoratifs */}
      <div aria-hidden="true" className="fixed inset-0 top-16 pointer-events-none">
        {/* Thousand Sunny */}
        <div className="absolute bottom-0 left-[90%] -translate-x-1/2 w-[1000px] h-[800px] opacity-25">
          <div className="w-full h-full bg-[url('/images/thousand-sunny.png')] bg-contain bg-no-repeat bg-center animate-float-slow transition-transform duration-700" />
        </div>

        {/* Mini Merry */}
        <div className="absolute top-[61%] left-[5%] w-64 h-64 opacity-30">
          <div className="w-full h-full bg-[url('/images/mini-merry.png')] bg-contain bg-no-repeat animate-float transform transition-transform duration-1000" />
        </div>

        {/* Jolly Roger */}
        <div className="absolute top-20 left-[10%] w-40 h-40 opacity-25">
          <div className="w-full h-full bg-[url('/images/jolly-roger.png')] bg-contain bg-no-repeat animate-float-slow rotate-animation transition-transform duration-500" />
        </div>
      </div>

      {/* Effet de profondeur océanique */}
      <div aria-hidden="true" className="fixed inset-0 top-16 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 via-blue-800/20 to-indigo-950/30" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.3)_100%)]" />
      </div>

      {/* Contenu principal */}
      <main className="relative z-10">
        <div className="w-[95%] md:w-[90%] mx-auto px-2 sm:px-4 py-4 sm:py-8">
          <div className="rounded-xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}