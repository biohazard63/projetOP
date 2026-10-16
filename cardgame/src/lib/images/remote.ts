// Official artwork hosts the site may show, relayed by /card-image (keep next.config.js remotePatterns in sync).
export const REMOTE_IMAGES = [
  { hostname: 'en.onepiece-cardgame.com', pathname: '/images/' },
  { hostname: 'fr.onepiece-cardgame.com', pathname: '/images/' },
  { hostname: 'fr.onepiece-cardgame.com', pathname: '/products/boosters/' },
  { hostname: 'fr.onepiece-cardgame.com', pathname: '/renewal/images/products/boosters/' },
  { hostname: 'en.onepiece-cardgame.com', pathname: '/onepiececg/bccard/en/products/' },
] as const
export function isRemoteImage(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && REMOTE_IMAGES.some(r => url.hostname === r.hostname && url.pathname.startsWith(r.pathname))
  } catch { return false }
}
