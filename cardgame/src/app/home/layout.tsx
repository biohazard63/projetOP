import React from 'react'
import { Navbar } from '@/components/Navbar'

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar variant="default" />
      <div className="min-h-screen bg-[url('/images/ocean-bg.png')] bg-cover bg-fixed bg-center relative pt-16">
        {/* Éléments décoratifs de l'équipage avec animations */}
        <div className="fixed inset-0 top-16 pointer-events-none z-0 overflow-hidden">
          {/* Chapeau de Luffy avec animation améliorée */}
          <div className="absolute top-24 left-[5%] w-40 h-40 opacity-40 transform -rotate-[15deg]">
            <div className="w-full h-full bg-[url('/images/straw-hat.png')] bg-contain bg-no-repeat animate-float-slow"></div>
          </div>

          {/* Sunny's Lion Head avec effet de flottement */}
          <div className="absolute bottom-10 left-[5%] w-72 h-72 opacity-40">
            <div className="w-full h-full bg-[url('/images/sunny-head.png')] bg-contain bg-no-repeat animate-float"></div>
          </div>

          {/* Mini Going Merry avec animation de navigation */}
          <div className="absolute top-[50%] left-[5%] w-40 h-40 opacity-35 animate-float-slow hidden md:block">
            <div className="w-full h-full bg-[url('/images/mini-merry.png')] bg-contain bg-no-repeat transform hover:scale-110 transition-transform"></div>
          </div>

          {/* Effets de lumière améliorés */}
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-full h-96 opacity-50" style={{ background: 'radial-gradient(circle, rgba(234, 179, 8, 0.4) 0%, transparent 70%)' }}></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 opacity-40 animate-pulse-slow" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)' }}></div>
          </div>
        </div>

        {/* Thousand Sunny en arrière-plan */}
        <div className="fixed bottom-0 right-0 w-full h-full pointer-events-none">
          <div className="absolute bottom-0 right-0 w-full h-[90vh] bg-[url('/images/thousand-sunny.png')] bg-contain bg-right bg-no-repeat opacity-40 transform scale-150"></div>
        </div>

        {/* Overlay de fond avec effet de soleil couchant */}
        <div className="absolute inset-0 top-16 bg-gradient-to-b from-orange-500/20 via-transparent to-blue-900/40"></div>

        {/* Contenu principal avec fond solide */}
        <div className="relative z-10">
          <div className="container mx-auto px-4 py-8">
            <div className="relative rounded-xl p-6 shadow-2xl border border-[#D84315]/20 hover:border-[#D84315]/40 transition-colors"
                 style={{ 
                   background: 'linear-gradient(to bottom, rgba(26, 26, 26, 0.98), rgba(26, 26, 26, 0.95))',
                   backdropFilter: 'blur(8px)'
                 }}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 