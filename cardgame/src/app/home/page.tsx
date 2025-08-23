'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Ship, Scroll, Sword, Trophy, Package, Star, Globe, Search, Download, FlaskConical, Users, HelpCircle, Images } from 'lucide-react'
import { motion } from 'framer-motion'

const features = [
  {
    title: 'Ouverture de boosters réaliste',
    description: 'Effets épiques, raretés pondérées, chances de God Pack et animations haut de gamme.',
    href: '/booster-opening',
    icon: Package,
    color: 'from-[#1E88E5] to-[#2196F3]',
  },
  {
    title: 'Gestion de collection',
    description: 'Suis tes cartes capturées, tes sets et tes pièces manquantes en un clin d’œil.',
    href: '/collection',
    icon: Trophy,
    color: 'from-[#8E24AA] to-[#9C27B0]',
  },
  {
    title: 'Créateur de deck',
    description: 'Conçois des stratégies, respecte les règles (1 Leader, 50 cartes), mobile first.',
    href: '/deck-builder',
    icon: Ship,
    color: 'from-[#D84315] to-[#FF5722]',
  },
  {
    title: 'Mode multijoueur (bêta)',
    description: 'Affronte d’autres joueurs. Fonctionnalité expérimentale en cours de stabilisation.',
    href: '/game',
    icon: Sword,
    color: 'from-[#43A047] to-[#4CAF50]',
  },
  {
    title: 'Cartes traduites et interface FR',
    description: 'Normalisation des raretés, libellés FR et UI entièrement francophone.',
    href: '/collection',
    icon: Globe,
    color: 'from-[#FFA000] to-[#FFC107]',
  },
  {
    title: 'Galerie & démos',
    description: 'Aperçus modernes des boosters, de la collection et du deck builder.',
    href: '#galerie',
    icon: Images,
    color: 'from-[#00ACC1] to-[#26C6DA]',
  },
]

const updates = [
  {
    title: 'Refonte Booster Opening',
    description: 'Nouveau fond responsive, animation de déchirure + éventail 3D des cartes, indicateur 12/12, skip, sons et animations par rareté.',
    icon: Package,
    color: 'from-[#1E88E5] to-[#2196F3]',
  },
  {
    title: 'Génération de boosters avancée',
    description: '12 cartes garanties (PRB-01 inclus), pondération par slot, prise en charge SR/L/SEC/SP CARD/TR, God Pack, déduplication intelligente.',
    icon: Star,
    color: 'from-[#FFB300] to-[#FFC107]',
  },
  {
    title: 'Collection Impel Down',
    description: 'Fond Impel Down optimisé mobile, filtres sets corrigés, liste déroulante scrollable, modal carte plein écran.',
    icon: Trophy,
    color: 'from-[#8E24AA] to-[#9C27B0]',
  },
  {
    title: 'Deck Builder mobile‑first',
    description: 'Ajout par tap, leaders en premier, “seulement possédées”, barre sticky récap + sauvegarde, suppression du verre.',
    icon: Ship,
    color: 'from-[#D84315] to-[#FF5722]',
  },
  {
    title: 'Navbar et Accueil modernisés',
    description: 'Navbar sticky avec état scroll + onglet actif. Hero responsive, nouveaux CTA, sections Fonctionnalités, Galerie, FAQ.',
    icon: Globe,
    color: 'from-[#00ACC1] to-[#26C6DA]',
  },
  {
    title: 'Imports et données',
    description: 'Scripts d’import (all-cards + sets), purge sécurisée, normalisation de raretés (SP CARD/TR). Correction Prisma (P2003).',
    icon: Scroll,
    color: 'from-gray-700 to-gray-900',
  },
  {
    title: 'Auth Google corrigée',
    description: 'Correction redirect_uri_mismatch et guide configuration Vercel/Google. Layout global sans défilement horizontal.',
    icon: Search,
    color: 'from-[#D84315] to-[#FF5722]',
  },
]

export default function HomePage() {
  const faqItems = [
    {
      q: 'Mugiwara TCG est-il officiel ?',
      a: 'Non, c’est une application fan-made créée par passion, en hommage à One Piece.'
    },
    {
      q: 'Puis-je jouer en ligne avec mes amis ?',
      a: 'Un mode multijoueur (bêta) est disponible. Les fonctionnalités évoluent progressivement.'
    },
    {
      q: 'Comment installer l’app sur mobile/PC ?',
      a: 'Accède à la section Télécharger pour les instructions iOS/Android/Desktop (PWA).' 
    }
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
                Bêta publique – nouvelles animations boosters
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight leading-[1.05] text-white">
                Mugiwara TCG
              </h1>
              <p className="text-white/90 text-lg md:text-2xl leading-relaxed max-w-2xl mx-auto lg:mx-0">
                L’appli fan‑made qui réinvente le One Piece Card Game pour les joueurs francophones.
              </p>

              <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-3">
                <Link href="#download" className="group">
                  <span className="inline-flex items-center gap-2 text-base md:text-lg px-6 py-3 rounded-xl text-white font-semibold transition-all duration-300 shadow-[0_10px_30px_rgba(234,88,12,.35)] bg-gradient-to-r from-[hsl(var(--op-red))] to-orange-600 group-hover:from-orange-600 group-active:scale-95">
                    <Download className="w-5 h-5" />
                    Télécharger l’application
                  </span>
                </Link>
                <Link href="#beta" className="group">
                  <span className="inline-flex items-center gap-2 text-base md:text-lg px-6 py-3 rounded-xl font-semibold transition-all duration-300 border border-white/15 text-white/90 hover:text-white hover:border-white/30 bg-white/5 backdrop-blur-md group-active:scale-95">
                    <FlaskConical className="w-5 h-5" />
                    Devenir Bêta Testeur
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

      {/* Présentation */}
      <section id="presentation" className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Application One Piece TCG en français</h2>
            <p className="text-white/80 text-lg mb-4">
              Mugiwara TCG est une application fan‑made, gratuite, pensée pour la communauté FR. Ouvre des boosters réalistes, gère ta collection, construis des decks et affronte d’autres pirates.
            </p>
            <p className="text-white/70">
              Compatible mobile et desktop. Interface 100% francophone et normalisation des raretés du jeu.
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-lg aspect-[16/10] rounded-2xl overflow-hidden border border-white/10 bg-white/5">
            <Image src="/images/deckbuild.png" alt="Aperçu de l’application Mugiwara TCG" fill className="object-cover" />
          </div>
        </div>
      </section>

      {/* Section des mises à jour */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-center mb-12 text-white">Mises à jour Mugiwara TCG (FR)</h2>
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
        <h2 className="text-4xl font-bold text-center mb-12 text-white">Fonctionnalités clés</h2>
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

      {/* Galerie: Screenshots & démos */}
      <section id="galerie" className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-center mb-12 text-white">Screenshots & démos</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { src: '/images/booster/op11.png', alt: 'Booster' },
            { src: '/images/deckbuild.png', alt: 'Deck Builder' },
            { src: '/images/deck.png', alt: 'Liste des decks' },
            { src: '/images/home.png', alt: 'Accueil' },
          ].map((shot, i) => (
            <div key={`shot-${i}`} className="relative aspect-[16/10] rounded-xl overflow-hidden border border-white/10 bg-white/5">
              <Image src={shot.src} alt={shot.alt} fill className="object-cover" />
            </div>
          ))}
        </div>
      </section>

      {/* Communauté */}
      <section id="beta" className="container mx-auto px-4 py-16">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Users className="w-6 h-6 text-white/90" />
            <h2 className="text-3xl font-bold text-white">Rejoins la communauté</h2>
          </div>
          <p className="text-white/80 mb-6 max-w-2xl mx-auto">Partage tes tirages, donne ton avis et aide à façonner le futur de Mugiwara TCG.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="#discord" className="group">
              <span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 transition-all">Rejoindre le Discord</span>
            </Link>
            <Link href="#download" className="group">
              <span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white/90 border border-white/15 hover:text-white hover:border-white/30 transition-all">Télécharger l’application</span>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container mx-auto px-4 py-16">
        <div className="flex items-center gap-3 mb-6">
          <HelpCircle className="w-6 h-6 text-white/90" />
          <h2 className="text-3xl md:text-4xl font-bold text-white">FAQ</h2>
        </div>
        <div className="space-y-4">
          {faqItems.map((item, idx) => (
            <details key={`faq-${idx}`} className="rounded-xl border border-white/10 bg-white/5 p-4 open:bg-white/7">
              <summary className="cursor-pointer text-white font-semibold">{item.q}</summary>
              <p className="text-white/80 mt-2 pl-1">{item.a}</p>
            </details>
          ))}
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      </section>

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
      className="relative h-[320px] sm:h-[380px] md:h-[440px] lg:h-[480px]"
    >
      <div className="absolute inset-0 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,.35)]" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="group relative w-full h-full max-w-[520px] max-h-[440px] px-4">
          {/* Halo */}
          <div className="absolute -inset-6 rounded-[28px] bg-[radial-gradient(ellipse_at_center,_rgba(255,200,100,.15),_transparent_60%)] blur-xl" />

          {/* Carte showcase (gauche) */}
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl transition-transform duration-500 group-hover:-translate-y-1 w-[70%] sm:w-[60%] md:w-[320px] aspect-[3/4]">
            <div className="relative w-full h-full">
              <Image src="/images/OP05-119.webp" alt="Carte Showcase" fill className="object-cover opacity-95" />
              {/* Shimmer */}
              <div className="pointer-events-none absolute -top-8 left-1/2 h-48 w-[140%] -translate-x-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/15 to-transparent blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          </div>

          {/* Booster (droite, décalé) */}
          <div className="hidden sm:block absolute top-1/2 left-[64%] -translate-y-1/2 w-[160px] sm:w-[220px] md:w-[320px] aspect-[2/3]">
            <div className="relative w-full h-full animate-float-slow">
              <Image src="/images/booster/op11.png" alt="Booster Pack" fill className="object-contain" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
} 