import React from 'react'
import Image from 'next/image'

export default function BoosterOpeningLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen text-white relative overflow-hidden pt-16 overscroll-none">
      {/* Fond image plein écran */}
      <div aria-hidden="true" className="fixed inset-0 top-16 -z-10 overflow-hidden">
        <Image
          src="/images/layoutBooster.png"
          alt=""
          fill
          priority
          className="object-cover object-center"
          style={{ objectPosition: 'center center' }}
        />
        {/* Légère superposition sombre pour la lisibilité du contenu */}
        <div className="absolute inset-0 bg-black/30" />
        {/* Masque anti-scroll latéral */}
        <div className="absolute -left-10 top-0 bottom-0 w-10 bg-transparent" />
        <div className="absolute -right-10 top-0 bottom-0 w-10 bg-transparent" />
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