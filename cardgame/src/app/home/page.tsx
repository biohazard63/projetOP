'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Ship, Scroll, Sword, Trophy, Package, Star, Globe, FlaskConical, Users, HelpCircle, Images } from 'lucide-react'
import { motion } from 'framer-motion'

const features = [
  {
    title: 'Ouverture de boosters réaliste',
    description: 'Revivez l’excitation d’un booster physique: animations épiques et raretés authentiques.',
    href: '/booster-opening',
    icon: Package,
    color: 'from-[#1E88E5] to-[#2196F3]',
    thumb: '/images/ouverture.png'
  },
  {
    title: 'Gestion de collection',
    description: 'Suivez vos cartes, sets complétés et pièces manquantes en un clin d’œil.',
    href: '/collection',
    icon: Trophy,
    color: 'from-[#8E24AA] to-[#9C27B0]',
    thumb: '/images/collection.png'
  },
  {
    title: 'Créateur de deck',
    description: 'Construisez des decks optimisés (1 Leader, 50 cartes), pensé mobile‑first.',
    href: '/deck-builder',
    icon: Ship,
    color: 'from-[#D84315] to-[#FF5722]',
    thumb: '/images/builder.png'
  },
  
 {
  title: 'liste des decks',
  description: 'Actions rapides : jouer, éditer, supprimer, avec option annuler.',
  href: '/decks',
  icon: Scroll,
  color: 'from-gray-700 to-gray-900',
 }

]

type UpdateCategory = 'animation' | 'boosters' | 'tech' | 'ui';

const updates = [
  {
    title: 'Deck Builder',
    description: 'Crée, modifie et supprime tes decks facilement (mobile & desktop).',
    icon: Ship,
    color: 'from-[#D84315] to-[#FF5722]',
    category: 'ui' as UpdateCategory,
    date: '2025‑05'
  },
  {
    title: 'Set OP12 ajouté',
    description: 'Les cartes OP12 arrivent : boosters, collection et filtres par set.',
    icon: Star,
    color: 'from-[#FFB300] to-[#FFC107]',
    category: 'boosters' as UpdateCategory,
    date: '2025‑05'
  },
  {
    title: 'Boosters améliorés',
    description: 'Animations plus réalistes, éventail des cartes et bouton pour passer.',
    icon: Package,
    color: 'from-[#1E88E5] to-[#2196F3]',
    category: 'animation' as UpdateCategory,
    date: '2025‑05'
  },
  {
    title: 'Collection plus claire',
    description: 'Nouveau fond Impel Down, filtres pratiques et vue carte plein écran.',
    icon: Trophy,
    color: 'from-[#8E24AA] to-[#9C27B0]',
    category: 'ui' as UpdateCategory,
    date: '2025‑05'
  },
  {
    title: 'Liste des decks',
    description: 'Actions rapides : jouer, éditer, supprimer, avec option annuler.',
    icon: Scroll,
    color: 'from-gray-700 to-gray-900',
    category: 'ui' as UpdateCategory,
    date: '2025‑05'
  },
  
]

export default function HomePage() {
  const screenshotsContainerRef = useRef<HTMLDivElement | null>(null)
  const [isSliderPaused, setIsSliderPaused] = useState(false)
  const faqItems = [
    {
      q: 'Mugiwara TCG est-il officiel ?',
      a: 'Non, c’est une application fan-made créée par passion, en hommage à One Piece.'
    },
    {
      q: 'Puis-je jouer en ligne avec mes amis ?',
      a: 'Un mode multijoueur (bêta) sera bientôt disponible. Les fonctionnalités évoluent progressivement.'
    },
    
   
  ]

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  }
  
  // Liste des captures pour le carrousel
  const galleryShots = [
    { src: '/images/booster/op12.png', alt: 'Dernier booster' },
    { src: '/images/imgBooster.png', alt: 'Liste des boosters' },
    { src: '/images/builder.png', alt: 'Deck Builder' },
    { src: '/images/collection.png', alt: 'Collection' },
    { src: '/images/ouverture.png', alt: 'Ouverture de booster' },
    { src: '/images/effecarte.png', alt: 'Effet carte' },
  ]

  // Auto-carrousel (défilement horizontal) avec pause au survol/touch
  useEffect(() => {
    const container = screenshotsContainerRef.current
    if (!container) return
    let currentIndex = 0

    const scrollToIndex = (index: number) => {
      const children = Array.from(container.children) as HTMLElement[]
      if (children.length === 0) return
      const clamped = ((index % children.length) + children.length) % children.length
      const first = children[0]
      const targetLeft = children[clamped].offsetLeft - first.offsetLeft
      container.scrollTo({ left: targetLeft, behavior: 'smooth' })
      currentIndex = clamped
    }

    const intervalId = window.setInterval(() => {
      if (isSliderPaused) return
      scrollToIndex(currentIndex + 1)
    }, 3000)

    const pause = () => setIsSliderPaused(true)
    const resume = () => setIsSliderPaused(false)
    container.addEventListener('mouseenter', pause)
    container.addEventListener('mouseleave', resume)
    container.addEventListener('touchstart', pause)
    container.addEventListener('touchend', resume)

    return () => {
      window.clearInterval(intervalId)
      container.removeEventListener('mouseenter', pause)
      container.removeEventListener('mouseleave', resume)
      container.removeEventListener('touchstart', pause)
      container.removeEventListener('touchend', resume)
    }
  }, [isSliderPaused])
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
              <div className="relative inline-block mx-auto lg:mx-0 rounded-3xl border border-white/15 bg-black/30 md:bg-black/25 backdrop-blur-xl p-6 md:p-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-md text-white/80 text-xs mb-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Bêta publique – nouvelles animations boosters
                </div>
                <h1 className="text-5xl md:text-7xl font-extrabold mb-2 tracking-tight leading-[1.05] text-white">
                  Mugiwara TCG
                </h1>
                <p className="text-white/90 text-lg md:text-2xl leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  L’appli fan‑made qui réinvente le One Piece Card Game pour les joueurs francophones.
                </p>
                <p className="text-white/80 text-sm md:text-base mt-2">Rejoins l’équipage, ouvre des trésors, deviens Roi des Pirates.</p>

                <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-3">
                  <Link href="https://discord.gg/8Z8tUY85" target="_blank" rel="noopener noreferrer" className="group">
                    <span className="inline-flex items-center gap-2 text-base md:text-lg px-6 py-3 rounded-xl text-white font-semibold transition-all duration-300 shadow-[0_12px_40px_rgba(255,170,40,.45)] ring-1 ring-amber-300/60 bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-400 group-hover:from-orange-600 group-hover:to-yellow-300 group-active:scale-95 animate-pulse">
                      <FlaskConical className="w-5 h-5" />
                      Devenir Bêta Testeur
                    </span>
                  </Link>
                  <Link href="/booster-opening" className="group">
                    <span className="inline-flex items-center gap-2 text-base md:text-lg px-6 py-3 rounded-xl font-semibold transition-all duration-300 border border-white/15 text-white/90 hover:text-white hover:border-white/30 bg-white/5 backdrop-blur-md group-active:scale-95">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 3a9 9 0 100 18 9 9 0 000-18zm1 13.5h-2V12H7.5v-2H11V7.5h2V10h3.5v2H13v4.5z"/></svg>
                      Voir l’ouverture de booster
                    </span>
                  </Link>
                </div>

                <p className="mt-2 text-xs text-white/70">Pas besoin de compte pour tester la démo.</p>

                <div className="mt-6 flex flex-wrap justify-center lg:justify-start gap-4 text-xs text-white/70">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">⚡ Animations fluides</div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">🎴 10k+ cartes</div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">🛡️ Comptes sécurisés</div>
                </div>
              </div>
            </motion.div>

            {/* Colonne droite: aperçu booster propre */}
            <HeroShowcase />
          </div>
        </div>
      </section>

      {/* Présentation */}
      <section id="presentation" className="container mx-auto px-4 py-12 md:py-16">
        <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-10">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Application One Piece TCG en français</h2>
              <p className="text-white/80 text-lg mb-4">Ouvre des boosters réalistes, collectionne tes cartes préférées, construis des decks et affronte tes amis en ligne.</p>
              <p className="text-white/70">
                Compatible mobile et desktop. Interface 100% francophone et normalisation des raretés du jeu.
              </p>
            </div>
            <div className="relative mx-auto w-full max-w-2xl aspect-[16/9]">
              {/* Mockup desktop */}
              <div className="absolute left-0 top-4 right-20 bottom-0 rounded-2xl overflow-hidden border border-white/10 bg-white/5 shadow-[0_20px_60px_rgba(0,0,0,.35)]">
                <Image src="/images/collection.png" alt="Aperçu desktop" fill className="object-cover" />
              </div>
              {/* Mockup mobile */}
              <div className="absolute right-0 -bottom-4 w-40 sm:w-44 md:w-48 aspect-[9/19] rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl">
                <Image src="/images/ouverture.png" alt="Aperçu mobile" fill className="object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section des mises à jour */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-center mb-8 text-white">Mises à jour Mugiwara TCG (FR)</h2>
        <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {updates.map((update) => {
            const Icon = update.icon
            return (
              <motion.div
                key={update.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="group relative"
              >
                <div className="rounded-2xl p-[1px] bg-gradient-to-br from-white/20 to-white/5 group-hover:from-white/40 group-hover:to-white/10 transition-all duration-300">
                  <div className={`relative rounded-2xl p-6 bg-white/10 backdrop-blur-xl border border-white/15 group-hover:border-white/25 overflow-hidden min-h-[150px] transition-transform duration-300 group-hover:-translate-y-0.5 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 ${update.category==='animation' ? 'before:bg-fuchsia-400' : update.category==='boosters' ? 'before:bg-amber-400' : update.category==='tech' ? 'before:bg-emerald-400' : 'before:bg-sky-400'}` }>
                    {/* Shine */}
                    <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-[140%] -translate-x-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Icône */}
                    <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${update.color} mb-3 shadow-[0_6px_20px_rgba(0,0,0,.15)]`}> 
                      <Icon className="w-6 h-6 text-white" />
                    </div>

                    {/* Texte */}
                    <h3 className="text-xl font-bold text-white mb-1 tracking-tight">{update.title}</h3>
                    <p className="text-white/85 line-clamp-2">{update.description}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-white/90 ${update.category==='animation' ? 'border-fuchsia-400/50' : update.category==='boosters' ? 'border-amber-400/50' : update.category==='tech' ? 'border-emerald-400/50' : 'border-sky-400/50'}`}>
                        {update.category==='animation' ? '⚡ Animation' : update.category==='boosters' ? '📦 Boosters' : update.category==='tech' ? '🔧 Technique' : '🎨 UI'}
                      </span>
                      <span className="text-white/60">{update.date}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
        </div>
      </div>

      {/* Section des fonctionnalités */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-center mb-8 text-white">Fonctionnalités clés</h2>
        <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon
            const colorStart = feature.color.split(' ')[1]
            const colorEnd = feature.color.split(' ')[3]
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="group"
              >
                <div className="rounded-2xl p-[1px] bg-gradient-to-br from-white/20 to-white/5 group-hover:from-white/40 group-hover:to-white/10 transition-all duration-300">
                  <Link
                    href={feature.href}
                    className="relative block overflow-hidden rounded-2xl p-6 bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-300 min-h-[200px] group-hover:-translate-y-0.5"
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
                    <p className="text-white/80 mb-4 line-clamp-2">{feature.description}</p>

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
      </div>

      {/* Galerie: Screenshots & démos */}
      <section id="galerie" className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-center mb-8 text-white">Screenshots & démos</h2>
        <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-4 md:p-6">
        <div ref={screenshotsContainerRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2">
          {galleryShots.map((shot) => (
            <div key={shot.src} className="relative aspect-[16/10] rounded-xl overflow-hidden border border-white/10 bg-white/5 group min-w-[70%] md:min-w-[40%] lg:min-w-[32%] snap-center">
              <Image src={shot.src} alt={shot.alt} fill className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent text-white text-xs md:text-sm">{shot.alt}</div>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* Communauté */}
      <section id="beta" className="container mx-auto px-4 py-16">
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 md:p-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Users className="w-6 h-6 text-white/90" />
            <h2 className="text-3xl font-bold text-white">Rejoins la communauté</h2>
          </div>
          <p className="text-white/80 mb-6 max-w-2xl mx-auto">Partage tes tirages, donne ton avis et aide à façonner le futur de Mugiwara TCG.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="https://discord.gg/8Z8tUY85" target="_blank" rel="noopener noreferrer" className="group">
              <span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 transition-all">Rejoindre le Discord</span>
            </Link>
          {/*   <Link href="#download" className="group">
              <span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white/90 border border-white/15 hover:text-white hover:border-white/30 transition-all">Télécharger l’application</span>
            </Link> */}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container mx-auto px-4 py-16">
        <div className="flex items-center gap-3 mb-6">
          <HelpCircle className="w-6 h-6 text-white/90" />
          <h2 className="text-3xl md:text-4xl font-bold text-white">FAQ</h2>
        </div>
        <div className="space-y-3">
          {faqItems.map((item) => (
            <details key={item.q} className="rounded-2xl border border-white/10 bg-white/5 p-4 open:bg-white/10 open:border-white/20 transition-colors">
              <summary className="cursor-pointer text-white font-semibold list-none">{item.q}</summary>
              <p className="text-white/80 mt-2 pl-0">{item.a}</p>
            </details>
          ))}
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      </section>

      {/* Footer global déplacé dans le layout */}
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
      className="relative h-[320px] sm:h-[380px] md:h-[440px] lg:h-[480px]"
    >
      <div className="absolute inset-0 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,.35)]" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="group relative w-full h-full max-w-[520px] max-h-[440px] px-4">
          {/* Halo */}
          <div className="absolute -inset-6 rounded-[28px] bg-[radial-gradient(ellipse_at_center,_rgba(255,200,100,.15),_transparent_60%)] blur-xl" />
          {/* Glow subtil */}
          <div className="pointer-events-none absolute -inset-10 rounded-[32px] bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,.06),_transparent_70%)]" />

          {/* Carte showcase (gauche) */}
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl transition-transform duration-500 group-hover:-translate-y-1 w-[70%] sm:w-[60%] md:w-[320px] aspect-[3/4]">
            <div className="relative w-full h-full">
              <Image src="/images/OP09-093.webp" alt="Carte Showcase" fill className="object-cover opacity-95" />
              {/* Shimmer */}
              <div className="pointer-events-none absolute -top-8 left-1/2 h-48 w-[140%] -translate-x-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/15 to-transparent blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          </div>

          {/* Booster (droite, décalé) */}
          <div className="hidden sm:block absolute top-1/2 left-[64%] -translate-y-1/2 w-[160px] sm:w-[220px] md:w-[320px] aspect-[2/3]">
            <div className="relative w-full h-full animate-float-slow">
              <Image src="/images/booster/op12.png" alt="Booster Pack" fill className="object-contain" />
              {/* Particules dorées discrètes */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,215,130,.18),transparent_35%),radial-gradient(circle_at_70%_80%,rgba(255,235,180,.12),transparent_40%)] blur-[2px]" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
} 