'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Github } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/home'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [captchaToken, setCaptchaToken] = useState('')
  const widgetRef = useRef<HTMLDivElement | null>(null)

  // Propager une erreur éventuelle provenant du provider OAuth
  const oauthError = searchParams.get('error')
  const oauthErrorMessage =
    oauthError === 'OAuthAccountNotLinked'
      ? "Cet email est déjà utilisé avec une autre méthode. Connectez-vous avec la même méthode ou associez votre compte."
      : oauthError === 'AccessDenied'
      ? "Accès refusé. Vérifiez que votre email Google est vérifié."
      : oauthError
      ? "La connexion a échoué. Veuillez réessayer."
      : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      try {
        const result = await signIn('credentials', {
          redirect: false,
          email,
          password,
          callbackUrl,
          captchaToken,
        })

        if (result?.error) {
          setError('Email ou mot de passe incorrect')
        } else {
          router.push(callbackUrl)
          router.refresh()
        }
      } catch {
        setError('Une erreur est survenue. Veuillez réessayer.')
      }
    })
  }

  // Turnstile widget si configuré
  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    if (!siteKey || !widgetRef.current) return
    function render() {
      try {
        // @ts-expect-error global
        if (window.turnstile && widgetRef.current) {
          // @ts-expect-error global
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

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
      <Card className="w-full max-w-md bg-black/70 backdrop-blur-xl border border-white/10 text-white shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl text-center font-bold tracking-tight">
            Connexion
          </CardTitle>
          <p className="text-center text-sm text-white/70 mt-1">Accède à Mugiwara TCG en toute sécurité</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(error || oauthErrorMessage) && (
              <div role="alert" aria-live="polite" className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-3">
                {error || oauthErrorMessage}
              </div>
            )}
            <Button
              onClick={() => signIn('google', { callbackUrl })}
              className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20"
              variant="outline"
              disabled={isPending}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continuer avec Google
            </Button>

            <Button
              onClick={() => signIn('github', { callbackUrl })}
              className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20"
              variant="outline"
              disabled={isPending}
            >
              <Github className="mr-2 h-4 w-4" />
              Continuer avec GitHub
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-2 text-white/60 bg-black/70">Ou avec email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1 text-white/90">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder-white/50 focus-visible:ring-orange-500"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1 text-white/90">
                  Mot de passe
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder-white/50 focus-visible:ring-orange-500"
                />
                <div className="mt-1 text-right">
                  <Link href="#forgot" className="text-xs text-white/60 hover:text-white">Mot de passe oublié ?</Link>
                </div>
              </div>
              
              {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div ref={widgetRef} className="flex justify-center" />
                </div>
              )}

              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg"
                aria-busy={isPending}
              >
                {isPending ? 'Connexion en cours...' : 'Se connecter'}
              </Button>
            </form>

            <p className="text-center text-sm text-white/70">
              Pas encore de compte ?{' '}
              <Link href="/register" className="text-orange-400 hover:text-orange-300 hover:underline">
                S&apos;inscrire
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 