'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Ship, Scroll, Sword, Trophy, Package, Star, Globe, Search } from 'lucide-react'
import { motion } from 'framer-motion'

const features = [
  {
    title: 'Deck Builder',
    description: 'Créez vos decks de pirates légendaires et devenez le Roi des Pirates !',
    href: '/deck-builder',
    icon: Ship,
    color: 'from-[#D84315] to-[#FF5722]', // Rouge One Piece
  },
  {
    title: 'Ouverture de Boosters',
    description: 'Découvrez de nouveaux trésors dans des boosters virtuels avec des animations épiques.',
    href: '/booster-opening',
    icon: Package,
    color: 'from-[#1E88E5] to-[#2196F3]', // Bleu océan
  },
  {
    title: 'Mode de Jeu',
    description: 'Affrontez d\'autres pirates dans des duels épiques sur Grand Line !',
    href: '/game',
    icon: Sword,
    color: 'from-[#43A047] to-[#4CAF50]', // Vert Zoro
  },
  {
    title: 'Collection',
    description: 'Gérez votre collection de cartes comme un véritable trésor de pirate.',
    href: '/collection',
    icon: Trophy,
    color: 'from-[#8E24AA] to-[#9C27B0]', // Violet royal
  },
]

const updates = [
  {
    title: 'Réinitialisation des Données',
    description: "Suite à une attaque de la Marine, les données ont été temporairement perdues. L'application est de nouveau en ligne après maintenance. Créez un nouveau compte pour rejoindre l'aventure !",
    icon: Scroll,
    color: 'from-gray-700 to-gray-900',
  },
  {
    title: 'Effets Visuels Épiques',
    description: 'Nouvelles animations dignes des plus grands combats de One Piece pour les cartes ultra rares !',
    icon: Star,
    color: 'from-[#FFB300] to-[#FFC107]',
  },
  {
    title: 'Cartes Légendaires',
    description: 'Système amélioré pour les cartes ultra rares incluant les versions alternatives et promotionnelles.',
    icon: Trophy,
    color: 'from-[#8E24AA] to-[#9C27B0]',
  },
  {
    title: 'Traductions Den Den Mushi',
    description: 'Les effets et textes des cartes seront bientôt disponibles en français grâce à notre équipe de Den Den Mushi !',
    icon: Globe,
    color: 'from-[#43A047] to-[#4CAF50]',
  },
  {
    title: 'Vivre Card Detector',
    description: 'Nouvelle fonctionnalité pour traquer les cartes manquantes de votre collection.',
    icon: Search,
    color: 'from-[#D84315] to-[#FF5722]',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section épurée et premium */}
      <section className="relative overflow-hidden pt-28 pb-20">
        {/* Aurora plus discrète */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 left-1/2 h-[55vh] w-[110vw] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,_hsl(var(--op-red)/_.10),_transparent_60%)] blur-3xl" />
          <div className="absolute top-1/3 -left-1/4 h-[30vh] w-[50vw] rounded-full bg-[radial-gradient(ellipse_at_center,_hsl(var(--op-ocean)/_.14),_transparent_60%)] blur-2xl" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Colonne gauche: titre + CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="text-center lg:text-left"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-md text-white/80 text-xs mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Version beta – animations boosters améliorées
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight leading-[1.05] text-white">
                One Piece<br className="hidden md:block" />
                <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">Card Game</span>
              </h1>
              <p className="text-white/90 text-lg md:text-2xl leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Ouvre des trésors, construis des decks légendaires et affronte d&apos;autres capitaines sur Grand Line.
              </p>

              <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-3">
                <Link href="/booster-opening" className="group">
                  <span className="inline-flex items-center gap-2 text-base md:text-lg px-6 py-3 rounded-xl text-white font-semibold transition-all duration-300 shadow-[0_10px_30px_rgba(234,88,12,.35)] bg-gradient-to-r from-[hsl(var(--op-red))] to-orange-600 group-hover:from-orange-600 group-active:scale-95">
                    Ouvrir un Trésor
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 group-hover:translate-x-0.5 transition-transform"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                  </span>
                </Link>
                <Link href="/deck-builder" className="group">
                  <span className="inline-flex items-center gap-2 text-base md:text-lg px-6 py-3 rounded-xl font-semibold transition-all duration-300 border border-white/15 text-white/90 hover:text-white hover:border-white/30 bg-white/5 backdrop-blur-md group-active:scale-95">
                    Construire un Deck
                  </span>
                </Link>
                <Link href="/collection" className="group">
                  <span className="inline-flex items-center gap-2 text-base md:text-lg px-6 py-3 rounded-xl font-semibold transition-all duration-300 border border-white/15 text-white/90 hover:text-white hover:border-white/30 bg-white/5 backdrop-blur-md group-active:scale-95">
                    Voir la Collection
                  </span>
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap justify-center lg:justify-start gap-4 text-xs text-white/60">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">⚡ Animations fluides</div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">🎴 10k+ cartes</div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">🛡️ Comptes sécurisés</div>
              </div>
            </motion.div>

            {/* Colonne droite: aperçu booster propre */}
            <HeroShowcase />
          </div>
        </div>
      </section>

      {/* Showcase composant extrait */}
      

      {/* Section des mises à jour */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-center mb-12 text-white">
          Journal du Nouveau Monde
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {updates.map((update, index) => {
            const Icon = update.icon
            return (
              <motion.div
                key={`${update.title}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: index * 0.05 }}
                className="group relative"
              >
                <div className="rounded-2xl p-[1px] bg-gradient-to-br from-white/20 to-white/5 group-hover:from-orange-400/40 group-hover:to-amber-200/20 transition-all duration-300">
                  <div className="relative rounded-2xl p-6 bg-white/5 backdrop-blur-xl border border-white/10 group-hover:border-white/20 overflow-hidden">
                    {/* Shine */}
                    <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-[140%] -translate-x-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Icône */}
                    <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${update.color} mb-4`}> 
                      <Icon className="w-6 h-6 text-white" />
                    </div>

                    {/* Texte */}
                    <h3 className="text-xl font-bold text-white mb-2">{update.title}</h3>
                    <p className="text-white/80">{update.description}</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Section des fonctionnalités */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-center mb-12 text-white">
          <span className="relative">
            Votre Aventure Commence Ici
            <div className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            const colorStart = feature.color.split(' ')[1]
            const colorEnd = feature.color.split(' ')[3]
            return (
              <motion.div
                key={`${feature.title}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: index * 0.05 }}
                className="group"
              >
                <div className="rounded-2xl p-[1px] bg-gradient-to-br from-white/20 to-white/5 group-hover:from-white/40 group-hover:to-white/10 transition-all duration-300">
                  <Link
                    href={feature.href}
                    className="relative block overflow-hidden rounded-2xl p-6 bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-300"
                  >
                    {/* Overlay de gradient directionnel au hover */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                      style={{ backgroundImage: `linear-gradient(to bottom right, ${colorStart}, ${colorEnd})` }}
                    />

                    {/* Icône */}
                    <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${feature.color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-white/80 mb-4">{feature.description}</p>

                    <span className="text-primary group-hover:text-white transition-colors flex items-center text-sm">
                      Explorer
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </Link>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Footer avec style One Piece */}
      <footer className="relative overflow-hidden py-16 mt-16">
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
        </div>
      </footer>
    </div>
  )
} 

// --- Nouveau composant: HeroShowcase ---
function HeroShowcase() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut', delay: 0.05 }}
      className="relative h-[360px] md:h-[420px] lg:h-[460px]"
    >
      <div className="absolute inset-0 rounded-3xl glass-effect shadow-[0_20px_60px_rgba(0,0,0,.35)]" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="group relative w-[520px] h-[420px]">
          {/* Halo */}
          <div className="absolute -inset-6 rounded-[28px] bg-[radial-gradient(ellipse_at_center,_rgba(255,200,100,.15),_transparent_60%)] blur-xl" />

          {/* Carte showcase (gauche) */}
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl transition-transform duration-500 group-hover:-translate-y-1 w-[320px] h-[420px]">
            <div className="relative w-full h-full">
              <Image src="/images/OP05-119.webp" alt="Carte Showcase" fill className="object-cover opacity-95" />
              {/* Shimmer */}
              <div className="pointer-events-none absolute -top-8 left-1/2 h-48 w-[140%] -translate-x-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/15 to-transparent blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          </div>

          {/* Booster (droite, décalé) */}
          <div className="absolute top-1/2 left-[60%] -translate-y-1/2 w-[360px] h-[560px]">
            <div className="relative w-full h-full animate-float-slow">
              <Image src="/images/booster/op11.png" alt="Booster Pack" fill className="object-contain" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
} 