import React from 'react'

export default function CollectionLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen  text-white relative overflow-hidden">
      {/* Arrière-plan Impel Down moderne (mobile-first) */}
      <div aria-hidden="true" className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[url('/images/impel-down.png')] bg-cover bg-center " />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B1120]/70 via-[#0B1120]/40 to-[#0B1120]/80" />
        {/* Voile bas brumeux */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#091022] to-transparent" />
      </div>

      {/* Contenu principal */}
      <main className="relative z-10">
        {children}
      </main>
    </div>
  )
}