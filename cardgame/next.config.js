/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration pour Next.js 15
  experimental: {
    // Activer les nouvelles fonctionnalités de Next.js 15
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    domains: ['en.onepiece-cardgame.com'],
    unoptimized: true,
  },
  typescript: {
    // Les erreurs TypeScript ne seront plus ignorées
  },
  // Configuration pour React 19
  reactStrictMode: true,
}

module.exports = nextConfig 