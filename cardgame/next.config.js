/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration pour Next.js 15
  experimental: {
    // Activer les nouvelles fonctionnalités de Next.js 15
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  async headers() {
    return [{ source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] }, { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] }]
  },
  images: {
    // Official artwork goes through /card-image (src/lib/images/loader.ts): its host blocks cross-site display and the
    // Vercel image optimizer has a monthly quota (402 once used up). remotePatterns stays the list of allowed hosts.
    loader: 'custom',
    loaderFile: './src/lib/images/loader.ts',
    // Same hosts as src/lib/images/remote.ts (the only ones /card-image relays).
    remotePatterns: [
      { protocol: 'https', hostname: 'en.onepiece-cardgame.com', pathname: '/images/**' },
      { protocol: 'https', hostname: 'fr.onepiece-cardgame.com', pathname: '/images/**' },
      { protocol: 'https', hostname: 'fr.onepiece-cardgame.com', pathname: '/products/boosters/**' },
      { protocol: 'https', hostname: 'fr.onepiece-cardgame.com', pathname: '/renewal/images/products/boosters/**' },
      { protocol: 'https', hostname: 'en.onepiece-cardgame.com', pathname: '/onepiececg/bccard/en/products/**' },
    ],
  },
  typescript: {
    // Les erreurs TypeScript ne seront plus ignorées
  },
  // Configuration pour React 19
  reactStrictMode: true,
}

module.exports = nextConfig
