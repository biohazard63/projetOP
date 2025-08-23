// Utilitaires de sécurité simples (in-memory) pour limiter les abus en environnement serverless
// NOTE: Pour la prod à grande échelle, recommander Upstash Redis Ratelimit.

type WindowBucket = {
  hits: number
  resetAt: number
}

const RATE_BUCKETS = new Map<string, WindowBucket>()
const FAIL_BUCKETS = new Map<string, WindowBucket>()

function hasHeaders(obj: unknown): obj is { headers?: Headers } {
  return typeof obj === 'object' && obj !== null && 'headers' in (obj as Record<string, unknown>)
}

export function getClientIp(request: Request | { headers?: Headers }): string {
  try {
    let headers: Headers | undefined
    if (request instanceof Request) {
      headers = request.headers
    } else if (hasHeaders(request)) {
      headers = request.headers
    }
    const fwd = headers?.get('x-forwarded-for') || headers?.get('x-real-ip') || ''
    const ip = fwd.split(',')[0]?.trim()
    return ip || 'unknown'
  } catch {
    return 'unknown'
  }
}

export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const bucket = RATE_BUCKETS.get(key)
  if (!bucket || now > bucket.resetAt) {
    const newBucket = { hits: 1, resetAt: now + windowMs }
    RATE_BUCKETS.set(key, newBucket)
    return { allowed: true, remaining: limit - 1, resetAt: newBucket.resetAt }
  }
  if (bucket.hits >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt }
  }
  bucket.hits += 1
  RATE_BUCKETS.set(key, bucket)
  return { allowed: true, remaining: Math.max(0, limit - bucket.hits), resetAt: bucket.resetAt }
}

export function isLocked(key: string): boolean {
  const now = Date.now()
  const bucket = FAIL_BUCKETS.get(key)
  return !!bucket && now < bucket.resetAt && bucket.hits <= 0
}

export function registerFailure(key: string, maxFailures: number, lockMs: number) {
  const now = Date.now()
  const bucket = FAIL_BUCKETS.get(key)
  if (!bucket || now > bucket.resetAt) {
    // nouvelle fenêtre; on repart à maxFailures - 1
    FAIL_BUCKETS.set(key, { hits: maxFailures - 1, resetAt: now + lockMs })
    return
  }
  bucket.hits -= 1
  if (bucket.hits <= 0) {
    // verrouiller jusqu'à resetAt
    bucket.hits = 0
  }
  FAIL_BUCKETS.set(key, bucket)
}

export function clearFailures(key: string) {
  FAIL_BUCKETS.delete(key)
}

// Politique de mot de passe minimaliste
export function isStrongPassword(password: string): boolean {
  if (typeof password !== 'string') return false
  const pw = password.trim()
  if (pw.length < 8 || pw.length > 72) return false
  const hasUpper = /[A-Z]/.test(pw)
  const hasLower = /[a-z]/.test(pw)
  const hasNum = /[0-9]/.test(pw)
  const hasSym = /[^A-Za-z0-9]/.test(pw)
  let score = 0
  if (hasUpper) score++
  if (hasLower) score++
  if (hasNum) score++
  if (hasSym) score++
  return score >= 3
}

export function isValidEmail(email: string): boolean {
  const e = (email || '').trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}


