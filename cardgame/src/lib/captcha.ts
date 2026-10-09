export async function verifyCaptcha(token: string | undefined | null, ip?: string): Promise<boolean> {
  const provider = (process.env.CAPTCHA_PROVIDER || '').toLowerCase()
  if (!provider) return true // désactivé si non configuré
  if (typeof token !== 'string' || !token) return false

  try {
    if (provider === 'turnstile') {
      const secret = process.env.TURNSTILE_SECRET
      if (!secret) return false
      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret, response: token, remoteip: ip || '' })
      })
      const data = await res.json() as { success?: boolean }
      return !!data.success
    }

    if (provider === 'recaptcha') {
      const secret = process.env.RECAPTCHA_SECRET
      if (!secret) return false
      const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret, response: token, remoteip: ip || '' })
      })
      const data = await res.json() as { success?: boolean }
      return !!data.success
    }

    return false
  } catch {
    return false
  }
}


