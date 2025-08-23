import React from 'react'

export default function DecksLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden pt-16">
      {/* Fond avec effet de guerre */}
      <div aria-hidden="true" className="fixed inset-0 top-16 bg-[url('/images/deck.png')] bg-cover bg-center opacity-[75%]" />

     

      {/* Contenu principal */}
      <main className="relative z-10">
        <div className="container mx-auto px-4 py-8">
          <div className="rounded-xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}