'use client'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

// Two themes only: light and dark. A choice saved as "system" by an earlier version becomes the theme it resolved to.
const options = [{ value: 'light', label: 'Clair', icon: Sun }, { value: 'dark', label: 'Sombre', icon: Moon }]
function useAppTheme() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  useEffect(() => { if (theme === 'system' && resolvedTheme) setTheme(resolvedTheme === 'light' ? 'light' : 'dark') }, [theme, resolvedTheme, setTheme])
  useEffect(() => { if (!resolvedTheme) return; document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.setAttribute('content', resolvedTheme === 'light' ? '#F8F6F0' : '#071222')) }, [resolvedTheme])
  return { mounted, current: resolvedTheme === 'light' ? 'light' : 'dark', setTheme }
}

/** Light / dark choice. `compact` is the sidebar switch (one button, sun and moon), the default a labelled pair. */
export function ThemeSelector({ compact = false }: { compact?: boolean }) {
  const { mounted, current, setTheme } = useAppTheme()
  if (compact) {
    const next = current === 'light' ? 'dark' : 'light'
    return <button type="button" className="piece-theme-switch" data-theme-current={mounted ? current : undefined} disabled={!mounted} onClick={() => setTheme(next)}
      aria-label={current === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'} title={current === 'light' ? 'Mode sombre' : 'Mode clair'}>
      <span className="piece-theme-switch-track" aria-hidden="true"><Sun size={14} /><Moon size={14} /><span className="piece-theme-switch-knob" /></span>
      <span className="piece-theme-switch-label">{current === 'light' ? 'Mode clair' : 'Mode sombre'}</span>
    </button>
  }
  return <fieldset className="piece-theme-selector"><legend>Apparence</legend><div>{options.map(({ value, label, icon: Icon }) =>
    <button key={value} type="button" disabled={!mounted} aria-pressed={mounted && current === value} onClick={() => setTheme(value)}><Icon size={18} />{label}</button>)}</div></fieldset>
}
