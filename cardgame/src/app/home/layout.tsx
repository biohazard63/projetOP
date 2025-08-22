import React from 'react'

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen">
      {/* Overlays aurora légers pour le segment /home (synchronisés avec le hero) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[-10vh] left-1/2 h-[40vh] w-[90vw] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,_hsl(var(--op-red)/_.08),_transparent_60%)] blur-2xl" />
        <div className="absolute top-[30vh] -left-[15vw] h-[40vh] w-[60vw] rounded-full bg-[radial-gradient(ellipse_at_center,_hsl(var(--op-ocean)/_.12),_transparent_60%)] blur-2xl" />
        <div className="absolute bottom-[-10vh] right-[-10vw] h-[40vh] w-[60vw] rounded-full bg-[radial-gradient(ellipse_at_center,_hsl(var(--op-gold)/_.10),_transparent_60%)] blur-xl" />
      </div>

      {/* Contenu */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
} 