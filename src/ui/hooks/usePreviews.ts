import { useEffect, useState } from 'react'

type FolderItem = { type: 'folder' | 'shortcut' | 'application' | 'filetype'; name: string; path: string; ext?: string; icon: string; status: '已修改' | '待处理' }

export default function usePreviews(icon: string, folder: string, folders: FolderItem[]) {
  const [iconPreview, setIconPreview] = useState('')
  const [folderPreview, setFolderPreview] = useState<{ ok: boolean; hasDesktopIni: boolean; hasFolderIco: boolean; iconPath: string; iconDataUrl: string } | null>(null)
  const [folderThumbs, setFolderThumbs] = useState<Record<string, string>>({})

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
      const pairs = await Promise.all(
        folders.filter((f) => f.type === 'folder').map(async (f) => {
          const r = await window.api.getFolderPreview(f.path)
          return [f.path, r.ok ? r.iconDataUrl : ''] as const
        })
      )
      if (!mounted) return
      const map: Record<string, string> = {}
      pairs.forEach(([k, v]) => { map[k] = v })
      setFolderThumbs(map)
    }
    if (folders.length) run()
    else setFolderThumbs({})
    return () => { mounted = false }
  }, [folders])

  return { iconPreview, folderPreview, folderThumbs, setFolderPreview, setFolderThumbs }
}