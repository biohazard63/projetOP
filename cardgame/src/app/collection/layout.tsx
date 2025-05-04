import React from 'react'
import RootLayout from '../layout'

export default function CollectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RootLayout variant="impel-down">
      <div className="min-h-screen bg-[#0B1120] text-white relative overflow-hidden">
        {/* Arrière-plan animé avec effets Impel Down */}
        <div className="fixed inset-0 bg-[url('/images/impel-down.png')] bg-cover bg-center opacity-30"></div>
        <div className="fixed inset-0 bg-gradient-to-b from-[#0B1120]/80 via-[#1B2A4A]/80 to-[#0B1120]/80"></div>

        {/* Éclairs animés */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[url('/images/lightning.png')] bg-repeat animate-lightning opacity-10"></div>
        </div>

        {/* Chaînes décoratives */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -left-20 top-0 w-40 h-screen">
            <div className="w-full h-full bg-[url('/images/chains.png')] bg-repeat-y opacity-20 animate-chains"></div>
          </div>
          <div className="absolute -right-20 top-0 w-40 h-screen">
            <div className="w-full h-full bg-[url('/images/chains.png')] bg-repeat-y opacity-20 animate-chains-reverse"></div>
          </div>
        </div>

        {/* Tour d'Impel Down */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] pointer-events-none opacity-10">
          <div className="w-full h-full bg-[url('/images/impel-down.png')] bg-contain bg-bottom bg-no-repeat"></div>
        </div>

        {/* Contenu principal */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    </RootLayout>
  )
} 