import { useEffect, useState } from 'react'

export default function useWindowControls() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    let mounted = true
    window.api?.windowIsMaximized?.().then((v) => { if (!mounted) return; setIsMaximized(!!v) })
    return () => { mounted = false }
  }, [])

  const minimize = async () => { await window.api?.windowMinimize?.() }
  const toggleMaximize = async () => { await window.api?.windowToggleMaximize?.(); const v = await window.api?.windowIsMaximized?.(); setIsMaximized(!!v) }
  const close = async () => { await window.api?.windowClose?.() }

  return { isMaximized, minimize, toggleMaximize, close }
}