import { useEffect, useRef, useState } from 'react'

type FolderItem = { type: 'folder' | 'shortcut' | 'application' | 'filetype'; name: string; path: string; ext?: string; icon: string; status: '已修改' | '待处理' }

export default function usePreviews(icon: string, folder: string, folders: FolderItem[]) {
  const [iconPreview, setIconPreview] = useState('')
  const [folderPreview, setFolderPreview] = useState<{ ok: boolean; hasDesktopIni: boolean; hasFolderIco: boolean; iconPath: string; iconDataUrl: string } | null>(null)
  const [folderThumbs, setFolderThumbs] = useState<Record<string, string>>({})
  const [itemThumbs, setItemThumbs] = useState<Record<string, string>>({})
  const prevPathsRef = useRef<string[]>([])

  useEffect(() => {
    let mounted = true
    if (!icon) { setIconPreview(''); return }
    window.api.getIconPreview(icon).then((res) => { if (!mounted) return; setIconPreview(res.ok ? res.dataUrl : '') })
    return () => { mounted = false }
  }, [icon])

  useEffect(() => {
    let mounted = true
    if (!folder) { setFolderPreview(null); return }
    window.api.getFolderPreview(folder).then((res) => { if (!mounted) return; setFolderPreview(res) })
    return () => { mounted = false }
  }, [folder])

  useEffect(() => {
    let mounted = true
    const run = async () => {
      const currentPaths = folders.map((f) => f.path).slice().sort()
      const prevPaths = prevPathsRef.current.slice().sort()
      const same = currentPaths.length === prevPaths.length && currentPaths.every((p, i) => p === prevPaths[i])
      if (same) return
      const pairs = await Promise.all(
        folders.map(async (f) => {
          if (f.type === 'folder') {
            const r = await window.api.getFolderPreview(f.path)
            return [f.path, r.ok ? r.iconDataUrl : ''] as const
          }
          if (f.type === 'shortcut') {
            const r = await window.api.getShortcutPreview?.(f.path)
            return [f.path, r && r.ok ? r.iconDataUrl : ''] as const
          }
          if (f.type === 'application') {
            const r = await window.api.getFileIconPreview?.(f.path)
            return [f.path, r && r.ok ? r.dataUrl : ''] as const
          }
          return [f.path, ''] as const
        })
      )
      if (!mounted) return
      const allMap: Record<string, string> = {}
      const folderMap: Record<string, string> = {}
      pairs.forEach(([k, v]) => { allMap[k] = v })
      folders.forEach((f) => { if (f.type === 'folder') folderMap[f.path] = allMap[f.path] || '' })
      setItemThumbs(allMap)
      setFolderThumbs(folderMap)
      prevPathsRef.current = folders.map((f) => f.path)
    }
    if (folders.length) run()
    else { setItemThumbs({}); setFolderThumbs({}) }
    return () => { mounted = false }
  }, [folders])

  return { iconPreview, folderPreview, folderThumbs, itemThumbs, setFolderPreview, setFolderThumbs, setItemThumbs }
}