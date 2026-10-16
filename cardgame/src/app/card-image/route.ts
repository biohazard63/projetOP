import { isRemoteImage } from '@/lib/images/remote'

export const runtime = 'nodejs'

const YEAR = 31_536_000
/**
 * Same-origin relay of official artwork: the upstream host sends `Cross-Origin-Resource-Policy: same-site`, so browsers
 * refuse to display it on this site directly. Only the allowed hosts and paths are relayed (never an open proxy); the
 * answer is cached a year by the browser and the CDN, so each image is fetched upstream once.
 */
export async function GET(request: Request) {
  const source = new URL(request.url).searchParams.get('u') ?? ''
  if (!isRemoteImage(source)) return new Response('Image non autorisée', { status: 400 })
  try {
    const upstream = await fetch(source, { signal: AbortSignal.timeout(8000), headers: { Accept: 'image/avif,image/webp,image/*' } })
    const type = upstream.headers.get('content-type') ?? ''
    if (!upstream.ok || !type.startsWith('image/')) return new Response('Image introuvable', { status: upstream.status === 404 ? 404 : 502, headers: { 'Cache-Control': 'public, max-age=300' } })
    return new Response(upstream.body, { headers: { 'Content-Type': type, 'Cache-Control': `public, max-age=${YEAR}, immutable`, 'CDN-Cache-Control': `public, max-age=${YEAR}, immutable`, 'X-Content-Type-Options': 'nosniff' } })
  } catch {
    return new Response('Image indisponible', { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }
}
