import React from 'react'

export default function CollectionLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen bg-[#0B1120] text-white relative overflow-hidden">
      {/* Arrière-plan animé avec effets Impel Down */}
      <div aria-hidden="true" className="fixed inset-0 bg-[url('/images/impel-down.png')] bg-cover bg-center opacity-30" />
      <div aria-hidden="true" className="fixed inset-0 bg-gradient-to-b from-[#0B1120]/80 via-[#1B2A4A]/80 to-[#0B1120]/80" />

      {/* Éclairs animés */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[url('/images/lightning.png')] bg-repeat animate-lightning opacity-10" />
      </div>

      {/* Chaînes décoratives */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -left-20 top-0 w-40 h-screen">
          <div className="w-full h-full bg-[url('/images/chains.png')] bg-repeat-y opacity-20 animate-chains" />
        </div>
        <div className="absolute -right-20 top-0 w-40 h-screen">
          <div className="w-full h-full bg-[url('/images/chains.png')] bg-repeat-y opacity-20 animate-chains-reverse" />
        </div>
      </div>

      {/* Tour d'Impel Down */}
      <div aria-hidden="true" className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] pointer-events-none opacity-10">
        <div className="w-full h-full bg-[url('/images/impel-down.png')] bg-contain bg-bottom bg-no-repeat" />
      </div>

      {/* Contenu principal */}
      <main className="relative z-10">
        {children}
      </main>
    </div>
  )
}