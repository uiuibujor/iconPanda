import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './ui/App'
import 'mac-scrollbar/dist/mac-scrollbar.css'
import './index.css'

try {
  const saved = localStorage.getItem('theme')
  const pref = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
  const isDark = saved ? saved === 'dark' : pref
  const root = document.documentElement
  if (isDark) root.classList.add('dark')
  else root.classList.remove('dark')
} catch {}

const el = document.getElementById('root') as HTMLElement
createRoot(el).render(<App />)