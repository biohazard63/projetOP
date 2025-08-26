import Image from 'next/image'

export function Footer() {
  return (
    <footer className="relative overflow-hidden py-16 mt-16 z-10">
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent backdrop-blur-sm"></div>
      <div className="container mx-auto px-4 text-center relative z-10">
        <div className="relative inline-block mb-6">
          <Image 
            src="/images/straw-hat.png" 
            alt="Chapeau de Paille" 
            width={80}
            height={80}
            className="w-20 h-20 mx-auto opacity-80 animate-float-slow"
          />
          <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle, rgba(234, 179, 8, 0.2) 0%, transparent 70%)' }}></div>
        </div>
        <p className="text-white/80 text-lg mb-4">© 2024 One Piece Card Game - L&apos;aventure continue</p>
        <p className="text-white/60">
          Ce site est un hommage créé par des fans, pour des fans.
          <br />
          One Piece est la propriété d&apos;Eiichiro Oda et de Bandai Namco.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm">
          <a href="https://discord.gg/8Z8tUY85" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white underline-offset-4 hover:underline">Discord</a>
          <a href="#mentions" className="text-white/60 hover:text-white/80">Mentions légales</a>
          <a href="#contact" className="text-white/60 hover:text-white/80">Contact</a>
        </div>
      </div>
    </footer>
  )
}


