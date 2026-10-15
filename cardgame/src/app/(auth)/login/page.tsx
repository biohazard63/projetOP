'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Github, Lock, LogIn, Mail } from 'lucide-react'
import AuthShell, { GoogleIcon } from '@/components/auth/AuthShell'

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
  const [isPWA, setIsPWA] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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

  // Détecter si on est dans une PWA
  useEffect(() => {
    const isInPWA = window.matchMedia('(display-mode: standalone)').matches ||
                   (window.navigator as { standalone?: boolean }).standalone === true ||
                   document.referrer.includes('android-app://')
    setIsPWA(isInPWA)
  }, [])

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

  return <AuthShell title="Bon retour, pirate !" subtitle="Connecte-toi pour retrouver ta collection, tes decks et ta partie en cours."
    footer={<>Pas encore de compte ? <Link href={`/register${callbackUrl !== '/home' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}>Créer un compte</Link></>}>
    {searchParams.get('registered') === 'true' && !error && <div role="status" className="au-alert ok">Compte créé ! Connecte-toi pour commencer l’aventure.</div>}
    {(error || oauthErrorMessage) && <div role="alert" aria-live="polite" className="au-alert">{error || oauthErrorMessage}</div>}
    {isPWA && <div className="au-alert warn"><strong>Conseil :</strong> si la connexion Google ne fonctionne pas, ouvre l’application dans ton navigateur.</div>}
    <div className="au-providers">
      <button type="button" className="au-provider" onClick={() => signIn('google', { callbackUrl })} disabled={isPending}><GoogleIcon />Continuer avec Google</button>
      <button type="button" className="au-provider" onClick={() => signIn('github', { callbackUrl })} disabled={isPending}><Github size={18} />Continuer avec GitHub</button>
    </div>
    <div className="au-divider"><span>ou avec ton email</span></div>
    <form onSubmit={handleSubmit} className="au-form">
      <label className="au-field" htmlFor="email"><span>Email</span>
        <span className="au-input"><Mail size={17} /><input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="ton@email.com" /></span></label>
      <label className="au-field" htmlFor="password"><span>Mot de passe</span>
        <span className="au-input"><Lock size={17} /><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
          <button type="button" className="au-eye" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
      <div className="au-row"><Link href="#forgot" className="au-muted-link">Mot de passe oublié ?</Link></div>
      {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && <div className="au-captcha"><div ref={widgetRef} /></div>}
      <button type="submit" className="au-submit" disabled={isPending} aria-busy={isPending}>{isPending ? <><span className="au-spinner" />Connexion en cours…</> : <><LogIn size={18} />Se connecter</>}</button>
    </form>
  </AuthShell>
}
