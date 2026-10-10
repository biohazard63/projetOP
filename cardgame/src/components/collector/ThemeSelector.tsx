'use client'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun, Monitor } from 'lucide-react'
const options = [{ value: 'light', label: 'Clair', icon: Sun }, { value: 'dark', label: 'Sombre', icon: Moon }, { value: 'system', label: 'Système', icon: Monitor }]
export function ThemeSelector() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  useEffect(()=>{if(!resolvedTheme)return;document.querySelectorAll('meta[name="theme-color"]').forEach(meta=>meta.setAttribute('content',resolvedTheme==='light'?'#F8F6F0':'#071222'))},[resolvedTheme])
  return <fieldset className="piece-theme-selector"><legend>Apparence</legend><div>{options.map(({ value, label, icon: Icon }) => <button key={value} type="button" disabled={!mounted} aria-pressed={mounted && theme === value} onClick={() => setTheme(value)}><Icon size={18} />{label}</button>)}</div></fieldset>
}
