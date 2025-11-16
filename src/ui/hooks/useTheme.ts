import { useEffect, useState } from 'react'

export default function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('theme')
      if (saved) return saved === 'dark'
      return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
    } catch {
      return false
    }
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) root.classList.add('dark')
    else root.classList.remove('dark')
    try { localStorage.setItem('theme', isDark ? 'dark' : 'light') } catch {}
  }, [isDark])

  const toggleDark = () => setIsDark((v) => !v)

  return { isDark, toggleDark }
}