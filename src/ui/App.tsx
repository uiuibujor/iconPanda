import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { MacScrollbar } from 'mac-scrollbar'
import { Folder, Link2, AppWindow } from 'lucide-react'
import TopBar from './parts/Topbar'
import TargetsSidebar from './parts/TargetsSidebar'
import BatchPreviewModal from './parts/BatchPreviewModal'
import IconLibraryGrid from './parts/IconLibraryGrid'
import PreviewPanel from './parts/PreviewPanel'
import LibraryToolbar from './parts/LibraryToolbar'
import BatchActionsBar from './parts/BatchActionsBar'
import { scoreIcon, matchBestIcon } from './lib/matching'
import usePreviews from './hooks/usePreviews'
import useIconLibrary from './hooks/useIconLibrary'
import useTheme from './hooks/useTheme'
import useWindowControls from './hooks/useWindowControls'
import { Button } from '../components/ui/button'
import { TooltipProvider } from '../components/ui/tooltip'

declare global {
  interface Window {
    api: {
      pickFolder: () => Promise<string>
      pickFolders: () => Promise<string[]>
      pickShortcut?: () => Promise<string>
      pickShortcuts?: () => Promise<string[]>
      pickIcon: () => Promise<string>
      pickIcons?: () => Promise<string[]>
      pickPngs?: () => Promise<string[]>
      pickApplication?: () => Promise<string>
      pickApplications?: () => Promise<string[]>
      applyIcon: (folder: string, icon: string) => Promise<boolean>
      applyShortcutIcon?: (lnk: string, icon: string) => Promise<boolean>
      applyApplicationIcon?: (exe: string, icon: string) => Promise<{ ok: boolean; shortcut: string }>
      getIconPreview: (iconPath: string) => Promise<{ ok: boolean; dataUrl: string }>
      getFolderPreview: (
        folderPath: string
      ) => Promise<{ ok: boolean; hasDesktopIni: boolean; hasFolderIco: boolean; iconPath: string; iconDataUrl: string }>
      getShortcutPreview?: (lnkPath: string) => Promise<{ ok: boolean; iconPath: string; iconDataUrl: string; fromTarget: boolean }>
      getFileIconPreview?: (filePath: string) => Promise<{ ok: boolean; dataUrl: string }>
      getFileIconPreviews?: (filePath: string, index?: number) => Promise<{ ok: boolean; items: { size: 'small' | 'large' | number; dataUrl: string }[] }>
      getIconLibraryPath: () => Promise<{ ok: boolean; path: string }>
      chooseIconLibraryFolder: () => Promise<{ ok: boolean; path: string }>
      listIcons: () => Promise<{ ok: boolean; items: { name: string; path: string }[] }>
      importIcon: (srcPath: string) => Promise<{ ok: boolean; dest: string }>
      convertPngToIco?: (pngPaths: string[]) => Promise<Array<{ ok: boolean; dest: string }>>
      extractIconToLibrary?: (srcPath: string, index?: number, size?: 'small' | 'large' | number) => Promise<{ ok: boolean; dest: string }>
      openIconLibraryFolder: () => Promise<{ ok: boolean }>
      resetIconLibraryPath: () => Promise<{ ok: boolean; path?: string }>
      deleteLibraryIcon?: (iconPath: string) => Promise<boolean>
      restoreIcon: (folder: string) => Promise<boolean>
      restoreShortcutIcon?: (lnk: string) => Promise<boolean>
      restoreApplicationShortcut?: (lnk: string) => Promise<boolean>
      windowMinimize: () => Promise<boolean>
      windowToggleMaximize: () => Promise<boolean>
      windowIsMaximized: () => Promise<boolean>
      windowClose: () => Promise<boolean>
      getAppVersion?: () => Promise<string>
      copyToClipboard?: (text: string) => Promise<boolean>
    }
  }
}

export default function App() {
  const [folder, setFolder] = useState('')
  const [icon, setIcon] = useState('')


  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolderItem, setSelectedFolderItem] = useState<{ type: 'folder' | 'shortcut' | 'application'; name: string; path: string; ext?: string; icon: string; status: '已修改' | '待处理' } | null>(null)
  const [folders, setFolders] = useState<Array<{ type: 'folder' | 'shortcut' | 'application'; name: string; path: string; ext?: string; icon: string; status: '已修改' | '待处理' }>>([])
  const [selectedLibraryIndex, setSelectedLibraryIndex] = useState<number | null>(null)
  const { libraryIcons, libraryLoading, thumbs, loadLibrary, pickIcon, convertPng, deleteIcon } = useIconLibrary((p) => setIcon(p))
  const { isDark, toggleDark } = useTheme()
  const { isMaximized, minimize, toggleMaximize, close } = useWindowControls()
  const [appliedIcons, setAppliedIcons] = useState<Record<string, string>>({})
  const [createdShortcuts, setCreatedShortcuts] = useState<Record<string, string>>({})
  const [selectedFolderPaths, setSelectedFolderPaths] = useState<string[]>([])
  const [recommendFilterActive, setRecommendFilterActive] = useState(false)
  const [recommendCycleIndex, setRecommendCycleIndex] = useState(0)
  const [batchPreviewOpen, setBatchPreviewOpen] = useState(false)
  const [batchCandidates, setBatchCandidates] = useState<Array<{ folder: string; name: string; iconPath: string; iconName: string; checked: boolean; exact: boolean }>>([])
  const [libraryPage, setLibraryPage] = useState(1)
  const [libraryPageSize, setLibraryPageSize] = useState(100)
  const [libraryPath, setLibraryPath] = useState('')
  const [batchPreviewMode, setBatchPreviewMode] = useState<'match' | 'apply' | 'restore'>('match')
  const [typeFilter, setTypeFilter] = useState<'all' | 'folder' | 'shortcut' | 'application'>('all')

  const { iconPreview, folderPreview, folderThumbs, itemThumbs, setFolderPreview, setFolderThumbs, setItemThumbs } = usePreviews(icon, folder, folders)
  const [sizePickerOpen, setSizePickerOpen] = useState(false)
  const [sizePickerImages, setSizePickerImages] = useState<Array<{ size: 'small' | 'large' | number; dataUrl: string }>>([])
  const [sizePickerSourcePath, setSizePickerSourcePath] = useState<string>('')

  const [locale, setLocale] = useState<'zh' | 'en'>(() => {
    try {
      const saved = localStorage.getItem('locale')
      return saved === 'en' ? 'en' : 'zh'
    } catch {
      return 'zh'
    }
  })

  useEffect(() => {
    try { localStorage.setItem('locale', locale) } catch {}
  }, [locale])

  const [appVersion, setAppVersion] = useState<string>('')
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const v = await window.api.getAppVersion?.()
      if (mounted && v) setAppVersion(v)
    })()
    return () => { mounted = false }
  }, [])
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const res = await window.api.getIconLibraryPath?.()
      if (mounted && res && res.ok) setLibraryPath(res.path)
    })()
    return () => { mounted = false }
  }, [])



  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])

  const shortcutPreview = useMemo(() => {
    if (!selectedFolderItem || selectedFolderItem.type !== 'shortcut') return null
    const dataUrl = itemThumbs[selectedFolderItem.path] || ''
    return dataUrl ? { ok: true, iconPath: '', iconDataUrl: dataUrl, fromTarget: false } : null
  }, [selectedFolderItem, itemThumbs])

  const applicationPreview = useMemo(() => {
    if (!selectedFolderItem || selectedFolderItem.type !== 'application') return ''
    const applied = appliedIcons[selectedFolderItem.path] || ''
    if (applied && icon === applied && iconPreview) return iconPreview
    return itemThumbs[selectedFolderItem.path] || ''
  }, [selectedFolderItem, itemThumbs, icon, iconPreview, appliedIcons])



  const pickFolder = useCallback(async () => {
    const f = await window.api.pickFolder()
    if (!f) return
    setFolder(f)
    const name = f.replace(/\\+/g, '/').split('/').filter(Boolean).pop() || (locale === 'zh' ? '文件夹' : 'Folder')
    const item = { type: 'folder' as const, name, path: f, icon: '📁', status: '待处理' as const }
    setFolders((prev) => {
      const exists = prev.some((p) => p.path === f)
      return exists ? prev : [item, ...prev]
    })
    setSelectedFolderItem(item)
  }, [locale])



  const apply = useCallback(async () => {
    const ok = await window.api.applyIcon(folder, icon)
    if (!ok) alert(locale === 'zh' ? '失败' : 'Failed')
    if (ok && selectedFolderItem && selectedFolderItem.type === 'folder') {
      setFolders((prev) => prev.map((p) => (p.path === selectedFolderItem.path ? { ...p, status: '已修改' } : p)))
      setSelectedFolderItem((prev) => (prev ? { ...prev, status: '已修改' } : prev))
      const res = await window.api.getFolderPreview(selectedFolderItem.path)
      setFolderPreview(res.ok ? res : null)
      setFolderThumbs((prev) => ({ ...prev, [selectedFolderItem.path]: res.ok ? res.iconDataUrl : '' }))
      setAppliedIcons((prev) => ({ ...prev, [selectedFolderItem.path]: icon }))
    }
  }, [folder, icon, selectedFolderItem])

  const applyShortcut = useCallback(async () => {
    if (!selectedFolderItem || selectedFolderItem.type !== 'shortcut' || !icon) return
    const ok = await window.api.applyShortcutIcon?.(selectedFolderItem.path, icon)
    if (!ok) alert(locale === 'zh' ? '失败' : 'Failed')
    if (ok) {
      setFolders((prev) => prev.map((p) => (p.path === selectedFolderItem.path ? { ...p, status: '已修改' } : p)))
      setSelectedFolderItem((prev) => (prev ? { ...prev, status: '已修改' } : prev))
      setAppliedIcons((prev) => ({ ...prev, [selectedFolderItem.path]: icon }))
      const res = await window.api.getShortcutPreview?.(selectedFolderItem.path)
      setItemThumbs((prev) => ({ ...prev, [selectedFolderItem.path]: res && res.ok ? res.iconDataUrl : (prev[selectedFolderItem.path] || '') }))
    }
  }, [selectedFolderItem, icon])

  const applyApplication = useCallback(async () => {
    if (!selectedFolderItem || selectedFolderItem.type !== 'application' || !icon) return
    const r = await window.api.applyApplicationIcon?.(selectedFolderItem.path, icon)
    const ok = !!(r && r.ok)
    if (!ok) alert(locale === 'zh' ? '失败' : 'Failed')
    if (ok) {
      const lnk = r!.shortcut
      setCreatedShortcuts((prev) => ({ ...prev, [selectedFolderItem.path]: lnk }))
      setFolders((prev) => prev.map((p) => (p.path === selectedFolderItem.path ? { ...p, status: '已修改' } : p)))
      setSelectedFolderItem((prev) => (prev ? { ...prev, status: '已修改' } : prev))
      setAppliedIcons((prev) => ({ ...prev, [selectedFolderItem.path]: icon }))
    }
  }, [selectedFolderItem, icon])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (file.type === 'image/x-icon' || file.name.toLowerCase().endsWith('.ico')) {
      setIcon(file.path)
    }
    if (file.type === '' && e.dataTransfer.items?.[0]?.kind === 'file') {
      setFolder(file.path)
      const name = file.path.replace(/\\+/g, '/').split('/').filter(Boolean).pop() || (locale === 'zh' ? '文件夹' : 'Folder')
      const item = { type: 'folder' as const, name, path: file.path, icon: '📁', status: '待处理' as const }
      setFolders((prev) => {
        const exists = prev.some((p) => p.path === file.path)
        return exists ? prev : [item, ...prev]
      })
      setSelectedFolderItem(item)
    }
  }, [locale])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])





  const recommendations = useMemo(() => {
    if (!selectedFolderItem || !libraryIcons.length) return [] as Array<{ name: string; path: string; score: number }>
    const name = selectedFolderItem.name
    const scored = libraryIcons.map((it) => ({ ...it, score: scoreIcon(name, it.name) }))
    scored.sort((a, b) => b.score - a.score)
    const filtered = scored.filter((it) => it.path !== icon)
    return filtered.slice(0, 8)
  }, [selectedFolderItem, libraryIcons, icon])

  const recommendationsLib = useMemo(() => {
    if (!selectedFolderItem || !libraryIcons.length) return [] as Array<{ name: string; path: string; score: number }>
    const name = selectedFolderItem.name
    const scored = libraryIcons.map((it) => ({ ...it, score: scoreIcon(name, it.name) }))
    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, 8)
  }, [selectedFolderItem, libraryIcons])

  const baseLib = useMemo(() => (recommendFilterActive ? recommendationsLib : libraryIcons), [recommendFilterActive, recommendationsLib, libraryIcons])
  const filteredLib = useMemo(() => (baseLib.length ? baseLib.filter((it) => it.name.toLowerCase().includes(searchQuery.toLowerCase())) : []), [baseLib, searchQuery])
  const pageCount = useMemo(() => Math.max(1, Math.ceil(filteredLib.length / libraryPageSize)), [filteredLib.length, libraryPageSize])
  useEffect(() => { setLibraryPage(1) }, [recommendFilterActive, searchQuery, selectedFolderItem, libraryIcons])
  useEffect(() => { if (libraryPage > pageCount) setLibraryPage(pageCount); if (libraryPage < 1) setLibraryPage(1) }, [libraryPage, pageCount])
  const pageItems = useMemo(() => {
    const start = (libraryPage - 1) * libraryPageSize
    return filteredLib.slice(start, start + libraryPageSize)
  }, [filteredLib, libraryPage, libraryPageSize])

  useEffect(() => {
    setRecommendCycleIndex(0)
  }, [selectedFolderItem, libraryIcons])

  const typeEmoji: Record<'folder' | 'shortcut' | 'application', string> = { folder: '📁', shortcut: '🔗', application: '💻' }
  const typeLabel: Record<'folder' | 'shortcut' | 'application', string> = { folder: '文件夹', shortcut: '快捷方式', application: '应用程序' }
  const typeBadgeClass = (t: 'folder' | 'shortcut' | 'application') => (
    t === 'folder'
      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
      : t === 'shortcut'
      ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
      : 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'
  )
  const typeIcon: Record<'folder' | 'shortcut' | 'application', React.ComponentType<{ className?: string }>> = {
    folder: Folder,
    shortcut: Link2,
    application: AppWindow,
  }
  const viewItems = useMemo(() => (typeFilter === 'all' ? folders : folders.filter((f) => f.type === typeFilter)), [folders, typeFilter])
  const isApplied = useCallback((p: string) => (selectedFolderItem ? appliedIcons[selectedFolderItem.path] === p : false), [selectedFolderItem, appliedIcons])
  const handleGridApplyOrRestore = useCallback(async (iconPath: string) => {
    if (!selectedFolderItem) return
    const already = appliedIcons[selectedFolderItem.path] === iconPath
    if (already) {
      let ok = false
      if (selectedFolderItem.type === 'folder') {
        ok = await window.api.restoreIcon(selectedFolderItem.path)
      } else if (selectedFolderItem.type === 'shortcut') {
        ok = !!(await window.api.restoreShortcutIcon?.(selectedFolderItem.path))
      } else if (selectedFolderItem.type === 'application') {
        const lnk = createdShortcuts[selectedFolderItem.path]
        if (lnk) ok = !!(await window.api.restoreApplicationShortcut?.(lnk))
      }
      if (ok) {
        setFolders((prev) => prev.map((p) => (p.path === selectedFolderItem.path ? { ...p, status: '待处理' } : p)))
        if (selectedFolderItem.type === 'folder') {
          const res = await window.api.getFolderPreview(selectedFolderItem.path)
          setFolderPreview(res.ok ? res : null)
          setFolderThumbs((prev) => ({ ...prev, [selectedFolderItem.path]: '' }))
        } else if (selectedFolderItem.type === 'application') {
          setItemThumbs((prev) => ({ ...prev }))
          setCreatedShortcuts((prev) => { const n = { ...prev }; delete n[selectedFolderItem.path]; return n })
        }
        setAppliedIcons((prev) => {
          const n = { ...prev }
          delete n[selectedFolderItem.path]
          return n
        })
        setIcon('')
      }
    } else {
      let ok = false
      if (selectedFolderItem.type === 'folder') {
        ok = await window.api.applyIcon(selectedFolderItem.path, iconPath)
      } else if (selectedFolderItem.type === 'shortcut') {
        ok = !!(await window.api.applyShortcutIcon?.(selectedFolderItem.path, iconPath))
      } else if (selectedFolderItem.type === 'application') {
        const r = await window.api.applyApplicationIcon?.(selectedFolderItem.path, iconPath)
        ok = !!(r && r.ok)
        if (ok && r) setCreatedShortcuts((prev) => ({ ...prev, [selectedFolderItem.path]: r.shortcut }))
      }
      if (ok) {
        setIcon(iconPath)
        setFolders((prev) => prev.map((p) => (p.path === selectedFolderItem.path ? { ...p, status: '已修改' } : p)))
        setSelectedFolderItem((prev) => (prev ? { ...prev, status: '已修改' } : prev))
        if (selectedFolderItem.type === 'folder') {
          const res = await window.api.getFolderPreview(selectedFolderItem.path)
          setFolderPreview(res.ok ? res : null)
          setFolderThumbs((prev) => ({ ...prev, [selectedFolderItem.path]: res.ok ? res.iconDataUrl : '' }))
        } else if (selectedFolderItem.type === 'shortcut') {
          const res = await window.api.getShortcutPreview?.(selectedFolderItem.path)
          setItemThumbs((prev) => ({ ...prev, [selectedFolderItem.path]: res && res.ok ? res.iconDataUrl : (prev[selectedFolderItem.path] || '') }))
        } else if (selectedFolderItem.type === 'application') {
          setItemThumbs((prev) => ({ ...prev, [selectedFolderItem.path]: prev[selectedFolderItem.path] || '' }))
        }
        setAppliedIcons((prev) => ({ ...prev, [selectedFolderItem.path]: iconPath }))
      } else {
        alert(locale === 'zh' ? '应用失败' : 'Apply failed')
      }
    }
  }, [selectedFolderItem, appliedIcons])
  const handleApplyIcon = useCallback(() => { if (selectedFolderItem?.type === 'shortcut') applyShortcut(); else if (selectedFolderItem?.type === 'application') applyApplication(); else apply() }, [selectedFolderItem, applyShortcut, applyApplication, apply])
  const handleRestore = useCallback(async () => {
    if (!selectedFolderItem) return
    if (selectedFolderItem.type === 'folder') {
      if (!folder) return
      const ok = await window.api.restoreIcon(folder)
      if (ok) {
        setFolders((prev) => prev.map((p) => (p.path === folder ? { ...p, status: '待处理' } : p)))
        const res = await window.api.getFolderPreview(folder)
        setFolderPreview(res.ok ? res : null)
        setFolderThumbs((prev) => ({ ...prev, [folder]: '' }))
        setAppliedIcons((prev) => { const n = { ...prev }; delete n[folder]; return n })
      } else {
        alert(locale === 'zh' ? '还原失败' : 'Restore failed')
      }
      return
    }
    if (selectedFolderItem.type === 'shortcut') {
      const ok = await window.api.restoreShortcutIcon?.(selectedFolderItem.path)
      if (ok) {
        setFolders((prev) => prev.map((p) => (p.path === selectedFolderItem.path ? { ...p, status: '待处理' } : p)))
        setAppliedIcons((prev) => { const n = { ...prev }; delete n[selectedFolderItem.path]; return n })
        const res = await window.api.getShortcutPreview?.(selectedFolderItem.path)
        setItemThumbs((prev) => ({ ...prev, [selectedFolderItem.path]: res && res.ok ? res.iconDataUrl : (prev[selectedFolderItem.path] || '') }))
      } else {
        alert(locale === 'zh' ? '还原失败' : 'Restore failed')
      }
      return
    }
    if (selectedFolderItem.type === 'application') {
      const lnk = createdShortcuts[selectedFolderItem.path]
      if (!lnk) { alert(locale === 'zh' ? '未找到已创建的快捷方式' : 'Created shortcut not found'); return }
      const ok = await window.api.restoreApplicationShortcut?.(lnk)
      if (ok) {
        setFolders((prev) => prev.map((p) => (p.path === selectedFolderItem.path ? { ...p, status: '待处理' } : p)))
        setAppliedIcons((prev) => { const n = { ...prev }; delete n[selectedFolderItem.path]; return n })
        setCreatedShortcuts((prev) => { const n = { ...prev }; delete n[selectedFolderItem.path]; return n })
      } else {
        alert(locale === 'zh' ? '还原失败' : 'Restore failed')
      }
      return
    }
    alert(locale === 'zh' ? '功能待开发' : 'Work in progress')
  }, [selectedFolderItem, folder])
  const handleSmartMatch = useCallback(() => {
    if (!selectedFolderItem) return
    const list = recommendationsLib
    if (!list.length) { alert(locale === 'zh' ? '图标库为空或无匹配项' : 'Library is empty or no matches'); return }
    const idx = recommendCycleIndex % list.length
    const chosen = list[idx]
    setRecommendFilterActive(true)
    const libIdx = libraryIcons.findIndex((li) => li.path === chosen.path)
    setSelectedLibraryIndex(libIdx >= 0 ? libIdx : null)
    setIcon(chosen.path)
    setRecommendCycleIndex((prev) => (prev + 1) % list.length)
  }, [selectedFolderItem, recommendationsLib, recommendCycleIndex, libraryIcons])
  const handleClickRecommendation = useCallback((path: string) => { const idx = libraryIcons.findIndex((li) => li.path === path); setSelectedLibraryIndex(idx >= 0 ? idx : null); setIcon(path) }, [libraryIcons])
  const handleBatchApply = useCallback(async () => {
    if (!icon || !selectedFolderPaths.length) return
    const targets = selectedFolderPaths.slice()
    if (!targets.length) { alert(locale === 'zh' ? '请选择文件夹、快捷方式或应用程序' : 'Please select folders, shortcuts, or applications'); return }
    const iname = icon.split(/\\|\//).pop() || ''
    const list: Array<{ folder: string; name: string; iconPath: string; iconName: string; checked: boolean; exact: boolean }> = []
    for (const p of targets) {
      const item = folders.find((f) => f.path === p)
      const name = item?.name || ''
      const folderKey = name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '')
      const iconBase = iname.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '')
      const exact = folderKey === iconBase
      list.push({ folder: p, name, iconPath: icon, iconName: iname, checked: true, exact })
    }
    if (!list.length) return
    setBatchCandidates(list)
    setBatchPreviewMode('apply')
    setBatchPreviewOpen(true)
  }, [icon, selectedFolderPaths, folders])
  const handleBatchMatch = useCallback(async () => {
    if (!selectedFolderPaths.length || !libraryIcons.length) return
    const targets = selectedFolderPaths.slice()
    if (!targets.length) { alert(locale === 'zh' ? '请选择文件夹、快捷方式或应用程序' : 'Please select folders, shortcuts, or applications'); return }
    const list: Array<{ folder: string; name: string; iconPath: string; iconName: string; checked: boolean; exact: boolean }> = []
    for (const p of targets) {
      const item = folders.find((f) => f.path === p)
      const name = item?.name || ''
      const best = name ? matchBestIcon(name, libraryIcons) : null
      if (best) {
        const folderKey = name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '')
        const iconBase = best.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '')
        const exact = folderKey === iconBase
        list.push({ folder: p, name, iconPath: best.path, iconName: best.name, checked: true, exact })
      }
    }
    if (!list.length) return
    setBatchCandidates(list)
    setBatchPreviewMode('match')
    setBatchPreviewOpen(true)
  }, [selectedFolderPaths, libraryIcons, folders])
  const handleBatchRestore = useCallback(async () => {
    if (!selectedFolderPaths.length) return
    const targets = selectedFolderPaths.slice()
    if (!targets.length) { alert(locale === 'zh' ? '请选择文件夹、快捷方式或应用程序' : 'Please select folders, shortcuts, or applications'); return }
    const list: Array<{ folder: string; name: string; iconPath: string; iconName: string; checked: boolean; exact: boolean }> = []
    for (const p of targets) {
      const item = folders.find((f) => f.path === p)
      const name = item?.name || ''
      list.push({ folder: p, name, iconPath: '', iconName: '', checked: true, exact: false })
    }
    if (!list.length) return
    setBatchCandidates(list)
    setBatchPreviewMode('restore')
    setBatchPreviewOpen(true)
  }, [selectedFolderPaths, folders])
  const handleBatchDelete = useCallback(() => {
    if (!selectedFolderPaths.length) return
    const targets = new Set(selectedFolderPaths)
    setFolders((prev) => prev.filter((f) => !targets.has(f.path)))
    setSelectedFolderPaths([])
    setFolder((prev) => (targets.has(prev) ? '' : prev))
    setSelectedFolderItem((prev) => (prev && targets.has(prev.path) ? null : prev))
    setFolderThumbs((prev) => { const n = { ...prev }; selectedFolderPaths.forEach((p) => { delete n[p] }); return n })
    setAppliedIcons((prev) => { const n = { ...prev }; selectedFolderPaths.forEach((p) => { delete n[p] }); return n })
  }, [selectedFolderPaths])
  return (
    <TooltipProvider delayDuration={60}>
    <div className="flex flex-col h-screen bg-background" onDrop={onDrop} onDragOver={onDragOver}>
      <TopBar
        searchQuery={searchQuery}
        onSearchChange={(v) => setSearchQuery(v)}
        isDark={isDark}
        onToggleDark={toggleDark}
        isMaximized={isMaximized}
        onMinimize={minimize}
        onToggleMaximize={toggleMaximize}
        onClose={close}
        locale={locale}
        onChangeLocale={(l) => setLocale(l)}
        appVersion={appVersion}
        onCopyGithub={async () => {
          const url = 'https://github.com/uiuibujor/iconPanda/'
          const ok = await window.api.copyToClipboard?.(url)
          return !!ok
        }}
      />

      <div className="flex-1 flex overflow-hidden">
        <TargetsSidebar
          viewItems={viewItems}
          allCount={folders.length}
          typeFilter={typeFilter}
          onTypeFilterChange={(v) => setTypeFilter(v as any)}
          selectedFolderItem={selectedFolderItem}
          selectedFolderPaths={selectedFolderPaths}
          itemThumbs={itemThumbs}
          folderThumbs={folderThumbs}
          typeEmoji={typeEmoji}
          typeLabel={typeLabel}
          typeIcon={typeIcon}
          typeBadgeClass={typeBadgeClass}
          onSelectItem={(f) => { setSelectedFolderItem(f); if (f.type === 'folder') setFolder(f.path); else setFolder('') }}
          onToggleSelect={(path, checked) => { setSelectedFolderPaths((prev) => { if (checked) return prev.includes(path) ? prev : [...prev, path]; return prev.filter((p) => p !== path) }) }}
          onToggleSelectAll={(checked) => { if (checked) setSelectedFolderPaths(viewItems.map((f) => f.path)); else setSelectedFolderPaths([]) }}
          onDeleteItem={(path) => { setFolders((prev) => prev.filter((p) => p.path !== path)); setFolder((prev) => (prev === path ? '' : prev)); setSelectedFolderItem((prev) => (prev?.path === path ? null : prev)); setSelectedFolderPaths((prev) => prev.filter((p) => p !== path)); setFolderThumbs((prev) => { const n = { ...prev }; delete n[path]; return n }) }}
          onAddFolders={async () => { const arr = await window.api.pickFolders?.(); if (!arr || !arr.length) return; const items = arr.map((f) => { const name = f.replace(/\\+/g, '/').split('/').filter(Boolean).pop() || 'Folder'; return { type: 'folder' as const, name, path: f, icon: '📁', status: '待处理' as const } }); setFolders((prev) => { const set = new Set(prev.map((p) => p.path)); const merged = items.filter((it) => !set.has(it.path)); return merged.length ? [...merged, ...prev] : prev }); setSelectedFolderItem(items[0] || null); setFolder(items[0]?.path || '') }}
          onAddShortcut={async () => {
            const arr = await window.api.pickShortcuts?.()
            if (!arr || !arr.length) return
            const items = arr.map((p) => { const name = p.replace(/\\+/g, '/').split('/').filter(Boolean).pop() || 'Shortcut'; return { type: 'shortcut' as const, name, path: p, icon: '🔗', status: '待处理' as const } })
            setFolders((prev) => { const set = new Set(prev.map((x) => x.path)); const merged = items.filter((it) => !set.has(it.path)); return merged.length ? [...merged, ...prev] : prev })
            setSelectedFolderItem(items[0] || null)
            setFolder('')
          }}
          onAddApplication={async () => {
            const arr = await window.api.pickApplications?.()
            if (!arr || !arr.length) return
            const items = arr.map((p) => { const name = p.replace(/\\+/g, '/').split('/').filter(Boolean).pop() || '应用程序'; return { type: 'application' as const, name, path: p, icon: '💻', status: '待处理' as const } })
            setFolders((prev) => { const set = new Set(prev.map((x) => x.path)); const merged = items.filter((it) => !set.has(it.path)); return merged.length ? [...merged, ...prev] : prev })
            setSelectedFolderItem(items[0] || null)
            setFolder('')
          }}
          isDark={isDark}
          locale={locale}
        />

        <div className="flex-1 flex flex-col">
          <div className="px-4 mt-4">
            <LibraryToolbar
              onImportIcons={pickIcon}
              onConvertPng={convertPng}
              onImportFromExe={async () => {
            console.log('[UI] onImportFromExe start')
            const p = await window.api.pickApplication?.()
            if (!p) return
            console.log('[UI] onImportFromExe picked', p)
            const previews = await window.api.getFileIconPreviews?.(p, 0)
            const items = previews && previews.ok ? previews.items : []
            console.log('[UI] onImportFromExe previews', { ok: previews?.ok, count: items.length, sizes: items.map((i) => i.size) })
            if (!items.length) {
              alert(locale === 'zh' ? '无法提取图标预览' : 'Cannot extract icon previews')
              return
            }
            setSizePickerSourcePath(p)
            setSizePickerImages(items)
            setSizePickerOpen(true)
              }}
              onOpenLibrary={async () => { const res = await window.api.chooseIconLibraryFolder(); if (res.ok) { setLibraryPath(res.path); await loadLibrary() } }}
              onRefresh={async () => { await loadLibrary() }}
              onClearFilter={() => { setRecommendFilterActive(false); setSearchQuery(''); setLibraryPage(1) }}
              canClear={!!(recommendFilterActive || searchQuery)}
              locale={locale}
              libraryPath={libraryPath}
            />
          </div>
          <MacScrollbar className="flex-1 px-6 pb-6" suppressScrollX skin={isDark ? 'dark' : 'light'}>
            <IconLibraryGrid
            libraryLoading={libraryLoading}
            pageItems={pageItems}
            thumbs={thumbs}
            icon={icon}
            isApplied={isApplied}
            onSelectIcon={(p) => setIcon(p)}
            onApplyOrRestore={handleGridApplyOrRestore}
            onDeleteIcon={(p) => deleteIcon(p)}
            empty={libraryIcons.length === 0}
            libraryPage={libraryPage}
            pageCount={pageCount}
            filteredCount={filteredLib.length}
            onFirstPage={() => setLibraryPage(1)}
            onPrevPage={() => setLibraryPage((p) => Math.max(1, p - 1))}
            onNextPage={() => setLibraryPage((p) => Math.min(pageCount, p + 1))}
            onLastPage={() => setLibraryPage(pageCount)}
            locale={locale}
            />
          </MacScrollbar>
        </div>

        <PreviewPanel
          selectedFolderItem={selectedFolderItem}
          folderPreview={folderPreview}
          shortcutPreview={shortcutPreview}
          applicationPreview={applicationPreview}
          typeEmoji={typeEmoji}
          iconPreview={iconPreview}
          icon={icon}
          folder={folder}
          onApplyIcon={handleApplyIcon}
          onRestore={handleRestore}
          onSmartMatch={handleSmartMatch}
          recommendations={(selectedFolderItem && (selectedFolderItem.type === 'folder' || selectedFolderItem.type === 'shortcut' || selectedFolderItem.type === 'application')) ? (recommendations.length ? recommendations : []) : []}
          thumbs={thumbs}
          onClickRecommendation={handleClickRecommendation}
          isDark={isDark}
          locale={locale}
        />
      </div>

      <BatchActionsBar
        selectedCount={selectedFolderPaths.length}
        totalCount={folders.length}
        onBatchApply={handleBatchApply}
        onBatchMatch={handleBatchMatch}
        onBatchRestore={handleBatchRestore}
        onBatchDelete={handleBatchDelete}
        locale={locale}
      />
    </div>

    {sizePickerOpen ? (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center no-drag">
        <div className="bg-card border border-border rounded-xl w-[520px] max-w-[90vw] shadow-xl">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="text-sm font-bold">{locale === 'zh' ? '选择要提取的图标尺寸' : 'Choose icon size to extract'}</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => { setSizePickerOpen(false); setSizePickerImages([]); setSizePickerSourcePath('') }} className="text-xs">{locale === 'zh' ? '取消' : 'Cancel'}</Button>
            </div>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            {sizePickerImages.map((it, idx) => (
              <div key={idx} className="border border-border rounded-lg p-3 flex flex-col items-center gap-2">
                <img src={it.dataUrl} alt={String(it.size)} className="w-16 h-16 object-contain" />
                <div className="text-xs text-gray-600">{typeof it.size === 'number' ? `${it.size}x${it.size}` : (it.size === 'large' ? (locale === 'zh' ? '大图标' : 'Large icon') : (locale === 'zh' ? '小图标' : 'Small icon'))}</div>
                <Button className="text-xs" onClick={async () => {
                  console.log('[UI] onPickSize start', { src: sizePickerSourcePath, size: it.size })
                  const r = await window.api.extractIconToLibrary?.(sizePickerSourcePath, 0, it.size)
                  if (r && r.ok) {
                    console.log('[UI] onPickSize success', r)
                    await loadLibrary()
                    setIcon(r.dest)
                    setSizePickerOpen(false)
                    setSizePickerImages([])
                    setSizePickerSourcePath('')
                  } else {
                    console.error('[UI] onPickSize failed', r)
                    alert(locale === 'zh' ? '提取失败' : 'Extract failed')
                  }
                }}>{locale === 'zh' ? '选择该尺寸' : 'Select this size'}</Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    ) : null}
    <BatchPreviewModal
      open={batchPreviewOpen}
      mode={batchPreviewMode}
      candidates={batchCandidates}
      folderThumbs={folderThumbs}
      itemThumbs={itemThumbs}
      thumbs={thumbs}
      onCancel={() => { setBatchPreviewOpen(false) }}
      onToggleCheck={(folder, checked) => { setBatchCandidates((prev) => prev.map((it) => (it.folder === folder ? { ...it, checked: !!checked } : it))) }}
      onToggleCheckAll={(checked) => { if (!batchCandidates.length) return; setBatchCandidates((prev) => prev.map((it) => ({ ...it, checked: !!checked }))) }}
      onConfirm={async () => {
        const targets = batchCandidates.filter((c) => c.checked)
        if (!targets.length) { setBatchPreviewOpen(false); return }
        if (batchPreviewMode === 'restore') {
          const success: string[] = []
          for (const c of targets) {
            const item = folders.find((f) => f.path === c.folder)
            let ok = false
            if (item?.type === 'folder') {
              ok = await window.api.restoreIcon(c.folder)
              if (ok) {
                const res = await window.api.getFolderPreview(c.folder)
                setFolderThumbs((prev) => ({ ...prev, [c.folder]: '' }))
              }
            } else if (item?.type === 'shortcut') {
              ok = !!(await window.api.restoreShortcutIcon?.(c.folder))
              if (ok) {
                const res = await window.api.getShortcutPreview?.(c.folder)
                setItemThumbs((prev) => ({ ...prev, [c.folder]: res && res.ok ? res.iconDataUrl : (prev[c.folder] || '') }))
              }
            } else if (item?.type === 'application') {
              const lnk = createdShortcuts[c.folder]
              if (lnk) ok = !!(await window.api.restoreApplicationShortcut?.(lnk))
              if (ok) {
                setCreatedShortcuts((prev) => { const n = { ...prev }; delete n[c.folder]; return n })
              }
            }
            if (ok) success.push(c.folder)
          }
          if (success.length) {
            setFolders((prev) => prev.map((f) => (success.includes(f.path) ? { ...f, status: '待处理' } : f)))
            setAppliedIcons((prev) => { const n = { ...prev }; success.forEach((p) => { delete n[p] }); return n })
            if (success.includes(folder)) { const res = await window.api.getFolderPreview(folder); setFolderPreview(res.ok ? res : null) }
          }
          setBatchPreviewOpen(false)
          return
        }
        const results: { p: string; ok: boolean; thumb?: string; applied?: string }[] = []
        for (const c of targets) {
          const item = folders.find((f) => f.path === c.folder)
          let ok = false
          let thumb = ''
          if (item?.type === 'folder') {
            ok = await window.api.applyIcon(c.folder, c.iconPath)
            if (ok) { const res = await window.api.getFolderPreview(c.folder); thumb = res.ok ? res.iconDataUrl : '' }
          } else if (item?.type === 'shortcut') {
            ok = !!(await window.api.applyShortcutIcon?.(c.folder, c.iconPath))
            if (ok) { const res = await window.api.getShortcutPreview?.(c.folder); thumb = res && res.ok ? res.iconDataUrl : '' }
          } else if (item?.type === 'application') {
            const r = await window.api.applyApplicationIcon?.(c.folder, c.iconPath)
            ok = !!(r && r.ok)
            if (ok && r) setCreatedShortcuts((prev) => ({ ...prev, [c.folder]: r.shortcut }))
          }
          results.push({ p: c.folder, ok, thumb, applied: c.iconPath })
        }
        const success = results.filter((r) => r.ok)
        if (success.length) {
          const successPaths = success.map((r) => r.p)
          setFolders((prev) => prev.map((f) => (successPaths.includes(f.path) ? { ...f, status: '已修改' } : f)))
          setFolderThumbs((prev) => { const n = { ...prev }; success.forEach((r) => { if (r.thumb) n[r.p] = r.thumb }); return n })
          setItemThumbs((prev) => { const n = { ...prev }; success.forEach((r) => { if (r.thumb) n[r.p] = r.thumb }); return n })
          setAppliedIcons((prev) => { const n = { ...prev }; success.forEach((r) => { if (r.applied) n[r.p] = r.applied }); return n })
        }
        setBatchPreviewOpen(false)
      }}
      locale={locale}
    />
    </TooltipProvider>
  )
}