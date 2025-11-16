import { useCallback, useEffect, useState } from 'react'

export default function useIconLibrary(onImported?: (p: string) => void) {
  const [libraryIcons, setLibraryIcons] = useState<Array<{ name: string; path: string }>>([])
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [thumbs, setThumbs] = useState<Record<string, string>>({})

  const loadLibrary = useCallback(async () => {
    setLibraryLoading(true)
    try {
      if (!window.api?.listIcons) { setLibraryIcons([]); return }
      const res = await window.api.listIcons()
      if (res.ok) setLibraryIcons(res.items)
    } finally {
      setLibraryLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const fetchThumbs = async () => {
      const pairs = await Promise.all(libraryIcons.map(async (it) => { const p = await window.api.getIconPreview(it.path); return [it.path, p.ok ? p.dataUrl : ''] as const }))
      if (!mounted) return
      const map: Record<string, string> = {}
      pairs.forEach(([k, v]) => { map[k] = v })
      setThumbs(map)
    }
    if (libraryIcons.length) fetchThumbs()
    else setThumbs({})
    return () => { mounted = false }
  }, [libraryIcons])

  const pickIcon = useCallback(async () => {
    setLibraryLoading(true)
    try {
      const arr = await window.api.pickIcons?.()
      if (arr && arr.length) {
        let last = ''
        for (const p of arr) { const r = await window.api.importIcon(p); if (r.ok) last = r.dest }
        if (last && onImported) onImported(last)
        await loadLibrary()
        return
      }
      const i = await window.api.pickIcon()
      if (!i) return
      const r = await window.api.importIcon(i)
      if (r.ok) {
        if (onImported) onImported(r.dest)
        await loadLibrary()
      }
    } finally {
      setLibraryLoading(false)
    }
  }, [onImported, loadLibrary])

  return { libraryIcons, libraryLoading, thumbs, loadLibrary, pickIcon }
}