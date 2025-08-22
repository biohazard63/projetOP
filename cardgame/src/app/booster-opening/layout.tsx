import React from 'react'

export default function BoosterOpeningLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen text-white relative overflow-hidden pt-16">
      {/* Thème distinct: Night Harbor (indigo/obsidian) */}
      <div aria-hidden="true" className="fixed inset-0 top-16 -z-10">
        {/* Dégradé de base sombre */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(1200px 700px at 50% 10%, rgba(29, 78, 216, 0.15), transparent 60%), linear-gradient(180deg, #0B1020 0%, #070B16 100%)' }} />
        {/* Spotlight cyan derrière le contenu */}
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 h-[40vh] w-[70vw] rounded-full blur-2xl opacity-30" style={{ background: 'radial-gradient(ellipse at center, rgba(56, 189, 248, 0.25), transparent 60%)' }} />
        {/* Grille subtile */}
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        {/* Vignette */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(1200px 600px at 50% 20%, rgba(0,0,0,0), rgba(0,0,0,0.25) 60%, rgba(0,0,0,0.5))' }} />
      </div>

      {/* Contenu principal */}
      <main className="relative z-10">
        <div className="w-[96%] md:w-[90%] mx-auto px-2 sm:px-4 py-4 sm:py-8">
          <div className="rounded-xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}