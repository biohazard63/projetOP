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
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.ts$/,
      include: [/scripts/],
      use: {
        loader: 'ignore-loader',
      },
    });
    return config;
  },
}

module.exports = nextConfig 