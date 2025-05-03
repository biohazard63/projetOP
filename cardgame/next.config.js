/** @type {import('next').NextConfig} */
const nextConfig = {
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
}

module.exports = nextConfig 