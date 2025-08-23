'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/home'
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [captchaToken, setCaptchaToken] = useState<string>('')
  const widgetRef = useRef<HTMLDivElement | null>(null)

  // Fonction de validation d'email
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Fonction de validation du mot de passe
  const isValidPassword = (password: string) => {
    // Au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    return passwordRegex.test(password)
  }

  // Fonction pour calculer la force du mot de passe
  const calculatePasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength += 1
    if (/[A-Z]/.test(password)) strength += 1
    if (/[a-z]/.test(password)) strength += 1
    if (/[0-9]/.test(password)) strength += 1
    if (/[@$!%*?&]/.test(password)) strength += 1
    return strength
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const strength = calculatePasswordStrength(e.target.value)
    setPasswordStrength(strength)
  }

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    if (!siteKey || !widgetRef.current) return
    function render() {
      try {
        // @ts-expect-error turnstile global
        if (window.turnstile && widgetRef.current) {
          // @ts-expect-error turnstile global
          window.turnstile.render(widgetRef.current, {
            sitekey: siteKey,
            callback: (token: string) => setCaptchaToken(token),
            theme: 'dark',
            appearance: 'always'
          })
        }
      } catch {}
    }
    const existing = document.querySelector('script[data-turnstile="true"]') as HTMLScriptElement | null
    if (!existing) {
      const s = document.createElement('script')
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      s.async = true
      s.defer = true
      s.dataset.turnstile = 'true'
      s.onload = () => render()
      document.body.appendChild(s)
    } else {
      render()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const name = (formData.get('name') as string).trim()
    const email = (formData.get('email') as string).trim().toLowerCase()
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    // Validation du nom
    if (name.length < 2) {
      setError('Le nom doit contenir au moins 2 caractères')
      return
    }

    // Validation de l'email
    if (!isValidEmail(email)) {
      setError('Veuillez entrer une adresse email valide')
      return
    }

    // Validation du mot de passe
    if (!isValidPassword(password)) {
      setError('Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial (@$!%*?&)')
      return
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, captchaToken }),
        })

        if (!response.ok) {
          const data: unknown = await response.json().catch(() => ({}))
          const message = (typeof data === 'object' && data !== null && 'message' in data) ? String((data as { message?: unknown }).message) : undefined
          throw new Error(message || 'Une erreur est survenue')
        }

        router.push(`/login?registered=true&callbackUrl=${encodeURIComponent(callbackUrl)}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      }
    })
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8 bg-black/70 p-8 md:p-10 rounded-2xl border border-white/10 shadow-2xl text-white"
      >
        <div className="text-center">
          <h2 className="mt-2 text-3xl font-extrabold">
            Créer un compte
          </h2>
          <p className="mt-2 text-sm text-white/70">
            Ou{' '}
            <Link
              href="/login"
              className="font-medium text-orange-400 hover:text-orange-300 transition-colors"
            >
              connectez-vous à votre compte
            </Link>
          </p>
        </div>

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1 text-white/90">
                Nom
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                minLength={2}
                placeholder="Votre nom"
                className="bg-white/5 border-white/10 text-white placeholder-white/50 focus-visible:ring-orange-500"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1 text-white/90">
                Adresse email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                placeholder="votre@email.com"
                className="bg-white/5 border-white/10 text-white placeholder-white/50 focus-visible:ring-orange-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1 text-white/90">
                Mot de passe
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$"
                onChange={handlePasswordChange}
                placeholder="••••••••"
                className="bg-white/5 border-white/10 text-white placeholder-white/50 focus-visible:ring-orange-500"
              />
              <div className="mt-2">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-orange-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${(passwordStrength / 5) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-white/70 mt-1">
                  Force du mot de passe: {passwordStrength}/5
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1 text-white/90">
                Confirmer le mot de passe
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$"
                placeholder="••••••••"
                className="bg-white/5 border-white/10 text-white placeholder-white/50 focus-visible:ring-orange-500"
              />
            </div>
          </div>

          {/* Captcha Turnstile */}
          {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div ref={widgetRef} className="flex justify-center" />
            </div>
          )}

          <div className="bg-white/5 border border-white/10 p-4 rounded-lg">
            <p className="text-sm font-medium text-white/90 mb-2">Le mot de passe doit contenir :</p>
            <ul className="text-sm text-white/70 space-y-1">
              <li className="flex items-center"><span className={`h-2 w-2 rounded-full mr-2 ${passwordStrength >= 1 ? 'bg-green-400' : 'bg-white/30'}`} />Au moins 8 caractères</li>
              <li className="flex items-center"><span className={`h-2 w-2 rounded-full mr-2 ${passwordStrength >= 2 ? 'bg-green-400' : 'bg-white/30'}`} />Une lettre majuscule</li>
              <li className="flex items-center"><span className={`h-2 w-2 rounded-full mr-2 ${passwordStrength >= 3 ? 'bg-green-400' : 'bg-white/30'}`} />Une lettre minuscule</li>
              <li className="flex items-center"><span className={`h-2 w-2 rounded-full mr-2 ${passwordStrength >= 4 ? 'bg-green-400' : 'bg-white/30'}`} />Un chiffre</li>
              <li className="flex items-center"><span className={`h-2 w-2 rounded-full mr-2 ${passwordStrength >= 5 ? 'bg-green-400' : 'bg-white/30'}`} />Un caractère spécial (@$!%*?&)</li>
            </ul>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isPending}
            className="group relative w-full flex justify-center py-3 px-4 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 focus:outline-none shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Inscription en cours...
              </div>
            ) : (
              "S\'inscrire"
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
} 