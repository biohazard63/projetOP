'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { Check, Eye, EyeOff, Lock, Mail, Sparkles, UserRound } from 'lucide-react'
import AuthShell, { GoogleIcon } from '@/components/auth/AuthShell'

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

  // Validation du mot de passe alignée sur l'API (min 8, 3 catégories sur 4)
  const isValidPassword = (password: string) => {
    const pw = (password || '').trim()
    if (pw.length < 8 || pw.length > 72) return false
    const hasUpper = /[A-Z]/.test(pw)
    const hasLower = /[a-z]/.test(pw)
    const hasNum = /[0-9]/.test(pw)
    const hasSym = /[^A-Za-z0-9]/.test(pw) // accepter tous les symboles
    const score = [hasUpper, hasLower, hasNum, hasSym].filter(Boolean).length
    return score >= 3
  }

  // Force du mot de passe: min 8 + points pour maj/min/chiffre/symbole
  const calculatePasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength += 1
    if (/[A-Z]/.test(password)) strength += 1
    if (/[a-z]/.test(password)) strength += 1
    if (/[0-9]/.test(password)) strength += 1
    if (/[^A-Za-z0-9]/.test(password)) strength += 1
    return Math.min(strength, 5)
  }

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    setPasswordStrength(calculatePasswordStrength(e.target.value))
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
      setError('Le mot de passe doit contenir au moins 8 caractères et 3 catégories sur 4 : majuscule, minuscule, chiffre, symbole.')
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

  // Each rule lights up as soon as it is met (same rules as the API: 8 characters and 3 categories out of 4).
  const rules = [{ ok: password.length >= 8, label: '8 caractères minimum' }, { ok: /[A-Z]/.test(password), label: 'Une majuscule' }, { ok: /[a-z]/.test(password), label: 'Une minuscule' }, { ok: /[0-9]/.test(password), label: 'Un chiffre' }, { ok: /[^A-Za-z0-9]/.test(password), label: 'Un symbole' }]
  const strengthLabel = ['Trop faible', 'Trop faible', 'Faible', 'Correct', 'Solide', 'Excellent'][passwordStrength]

  return <AuthShell title="Rejoins l’équipage !" subtitle="Crée ton compte gratuit : boosters, collection et parties contre le bot t’attendent."
    footer={<>Déjà un compte ? <Link href={`/login${callbackUrl !== '/home' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}>Se connecter</Link></>}>
    <div className="au-providers">
      <button type="button" className="au-provider" onClick={() => signIn('google', { callbackUrl })} disabled={isPending}><GoogleIcon />S’inscrire avec Google</button>
    </div>
    <div className="au-divider"><span>ou avec ton email</span></div>
    <form className="au-form" onSubmit={handleSubmit}>
      <label className="au-field" htmlFor="name"><span>Nom de pirate</span>
        <span className="au-input"><UserRound size={17} /><input id="name" name="name" type="text" required minLength={2} autoComplete="nickname" placeholder="Monkey D. Toi" /></span></label>
      <label className="au-field" htmlFor="email"><span>Adresse email</span>
        <span className="au-input"><Mail size={17} /><input id="email" name="email" type="email" autoComplete="email" required pattern="[^\s@]+@[^\s@]+\.[^\s@]+" placeholder="ton@email.com" /></span></label>
      <label className="au-field" htmlFor="password"><span>Mot de passe</span>
        <span className="au-input"><Lock size={17} /><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} onChange={handlePasswordChange} placeholder="••••••••" />
          <button type="button" className="au-eye" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
      <div className="au-strength" data-level={passwordStrength}>
        <div className="au-strength-bar">{[1, 2, 3, 4, 5].map(i => <i key={i} className={passwordStrength >= i ? 'on' : ''} />)}</div>
        <span>{password ? strengthLabel : 'Force du mot de passe'}</span>
      </div>
      <ul className="au-rules" aria-label="Règles du mot de passe">{rules.map(r => <li key={r.label} className={r.ok ? 'ok' : ''}><Check size={13} />{r.label}</li>)}</ul>
      <p className="au-hint">Au moins 8 caractères et 3 catégories sur 4 (majuscule, minuscule, chiffre, symbole).</p>
      <label className="au-field" htmlFor="confirmPassword"><span>Confirmer le mot de passe</span>
        <span className="au-input"><Lock size={17} /><input id="confirmPassword" name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} placeholder="••••••••" /></span></label>
      {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && <div className="au-captcha"><div ref={widgetRef} /></div>}
      {error && <div role="alert" className="au-alert">{error}</div>}
      <button type="submit" className="au-submit" disabled={isPending}>{isPending ? <><span className="au-spinner" />Inscription en cours…</> : <><Sparkles size={18} />Créer mon compte</>}</button>
    </form>
  </AuthShell>
}
