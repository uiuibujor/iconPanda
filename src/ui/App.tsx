import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Folder, Link2, FileText, AppWindow } from 'lucide-react'
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

declare global {
  interface Window {
    api: {
      pickFolder: () => Promise<string>
      pickFolders: () => Promise<string[]>
      pickShortcut?: () => Promise<string>
      pickShortcuts?: () => Promise<string[]>
      pickIcon: () => Promise<string>
      pickIcons?: () => Promise<string[]>
      applyIcon: (folder: string, icon: string) => Promise<boolean>
      applyShortcutIcon?: (lnk: string, icon: string) => Promise<boolean>
      getIconPreview: (iconPath: string) => Promise<{ ok: boolean; dataUrl: string }>
      getFolderPreview: (
        folderPath: string
      ) => Promise<{ ok: boolean; hasDesktopIni: boolean; hasFolderIco: boolean; iconPath: string; iconDataUrl: string }>
      getIconLibraryPath: () => Promise<{ ok: boolean; path: string }>
      chooseIconLibraryFolder: () => Promise<{ ok: boolean; path: string }>
      listIcons: () => Promise<{ ok: boolean; items: { name: string; path: string }[] }>
      importIcon: (srcPath: string) => Promise<{ ok: boolean; dest: string }>
      openIconLibraryFolder: () => Promise<{ ok: boolean }>
      resetIconLibraryPath: () => Promise<{ ok: boolean; path?: string }>
      restoreIcon: (folder: string) => Promise<boolean>
      restoreShortcutIcon?: (lnk: string) => Promise<boolean>
      windowMinimize: () => Promise<boolean>
      windowToggleMaximize: () => Promise<boolean>
      windowIsMaximized: () => Promise<boolean>
      windowClose: () => Promise<boolean>
    }
  }
}

export default function App() {
  const [folder, setFolder] = useState('')
  const [icon, setIcon] = useState('')
  

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolderItem, setSelectedFolderItem] = useState<{ type: 'folder' | 'shortcut' | 'application' | 'filetype'; name: string; path: string; ext?: string; icon: string; status: '已修改' | '待处理' } | null>(null)
  const [folders, setFolders] = useState<Array<{ type: 'folder' | 'shortcut' | 'application' | 'filetype'; name: string; path: string; ext?: string; icon: string; status: '已修改' | '待处理' }>>([])
  const [selectedLibraryIndex, setSelectedLibraryIndex] = useState<number | null>(null)
  const { libraryIcons, libraryLoading, thumbs, loadLibrary, pickIcon } = useIconLibrary((p) => setIcon(p))
  const { isDark, toggleDark } = useTheme()
  const { isMaximized, minimize, toggleMaximize, close } = useWindowControls()
  const [appliedIcons, setAppliedIcons] = useState<Record<string, string>>({})
  const [selectedFolderPaths, setSelectedFolderPaths] = useState<string[]>([])
  const [recommendFilterActive, setRecommendFilterActive] = useState(false)
  const [recommendCycleIndex, setRecommendCycleIndex] = useState(0)
  const [batchPreviewOpen, setBatchPreviewOpen] = useState(false)
  const [batchCandidates, setBatchCandidates] = useState<Array<{ folder: string; name: string; iconPath: string; iconName: string; checked: boolean; exact: boolean }>>([])
  const [libraryPage, setLibraryPage] = useState(1)
  const [libraryPageSize, setLibraryPageSize] = useState(100)
  const [batchPreviewMode, setBatchPreviewMode] = useState<'match' | 'apply' | 'restore'>('match')
  const [typeFilter, setTypeFilter] = useState<'all' | 'folder' | 'shortcut' | 'application' | 'filetype'>('all')

  const { iconPreview, folderPreview, folderThumbs, setFolderPreview, setFolderThumbs } = usePreviews(icon, folder, folders)

  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])



  const pickFolder = useCallback(async () => {
    const f = await window.api.pickFolder()
    if (!f) return
    setFolder(f)
    const name = f.replace(/\\+/g, '/').split('/').filter(Boolean).pop() || 'Folder'
    const item = { type: 'folder' as const, name, path: f, icon: '📁', status: '待处理' as const }
    setFolders((prev) => {
      const exists = prev.some((p) => p.path === f)
      return exists ? prev : [item, ...prev]
    })
    setSelectedFolderItem(item)
  }, [])

  

  const apply = useCallback(async () => {
    const ok = await window.api.applyIcon(folder, icon)
    if (!ok) alert('失败')
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
    if (!ok) alert('失败')
    if (ok) {
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
      const name = file.path.replace(/\\+/g, '/').split('/').filter(Boolean).pop() || 'Folder'
      const item = { type: 'folder' as const, name, path: file.path, icon: '📁', status: '待处理' as const }
      setFolders((prev) => {
        const exists = prev.some((p) => p.path === file.path)
        return exists ? prev : [item, ...prev]
      })
      setSelectedFolderItem(item)
    }
  }, [])

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

  const typeEmoji: Record<'folder' | 'shortcut' | 'application' | 'filetype', string> = { folder: '📁', shortcut: '🔗', application: '💻', filetype: '📄' }
  const typeLabel: Record<'folder' | 'shortcut' | 'application' | 'filetype', string> = { folder: '文件夹', shortcut: '快捷方式', application: '应用程序', filetype: '文件类型' }
  const typeBadgeClass = (t: 'folder' | 'shortcut' | 'application' | 'filetype') => (
    t === 'folder'
      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
      : t === 'shortcut'
      ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
      : t === 'application'
      ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'
      : 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800'
  )
  const typeIcon: Record<'folder' | 'shortcut' | 'application' | 'filetype', React.ComponentType<{ className?: string }>> = {
    folder: Folder,
    shortcut: Link2,
    application: AppWindow,
    filetype: FileText,
  }
  const viewItems = useMemo(() => (typeFilter === 'all' ? folders : folders.filter((f) => f.type === typeFilter)), [folders, typeFilter])
  const isApplied = useCallback((p: string) => (selectedFolderItem ? appliedIcons[selectedFolderItem.path] === p : false), [selectedFolderItem, appliedIcons])
  const handleGridApplyOrRestore = useCallback(async (iconPath: string) => {
    if (!selectedFolderItem) return
    if (selectedFolderItem.type === 'application' || selectedFolderItem.type === 'filetype') { alert('功能待开发'); return }
    const already = appliedIcons[selectedFolderItem.path] === iconPath
    if (already) {
      const ok = selectedFolderItem.type === 'folder' ? await window.api.restoreIcon(selectedFolderItem.path) : await window.api.restoreShortcutIcon?.(selectedFolderItem.path)
      if (ok) {
        setFolders((prev) => prev.map((p) => (p.path === selectedFolderItem.path ? { ...p, status: '待处理' } : p)))
        if (selectedFolderItem.type === 'folder') {
          const res = await window.api.getFolderPreview(selectedFolderItem.path)
          setFolderPreview(res.ok ? res : null)
          setFolderThumbs((prev) => ({ ...prev, [selectedFolderItem.path]: '' }))
        }
        setAppliedIcons((prev) => {
          const n = { ...prev }
          delete n[selectedFolderItem.path]
          return n
        })
        setIcon('')
      }
    } else {
      const ok = selectedFolderItem.type === 'folder' ? await window.api.applyIcon(selectedFolderItem.path, iconPath) : await window.api.applyShortcutIcon?.(selectedFolderItem.path, iconPath)
      if (ok) {
        setIcon(iconPath)
        setFolders((prev) => prev.map((p) => (p.path === selectedFolderItem.path ? { ...p, status: '已修改' } : p)))
        setSelectedFolderItem((prev) => (prev ? { ...prev, status: '已修改' } : prev))
        if (selectedFolderItem.type === 'folder') {
          const res = await window.api.getFolderPreview(selectedFolderItem.path)
          setFolderPreview(res.ok ? res : null)
          setFolderThumbs((prev) => ({ ...prev, [selectedFolderItem.path]: res.ok ? res.iconDataUrl : '' }))
        }
        setAppliedIcons((prev) => ({ ...prev, [selectedFolderItem.path]: iconPath }))
      } else {
        alert('应用失败')
      }
    }
  }, [selectedFolderItem, appliedIcons])
  const handleApplyIcon = useCallback(() => { if (selectedFolderItem?.type === 'shortcut') applyShortcut(); else apply() }, [selectedFolderItem, applyShortcut, apply])
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
        alert('还原失败')
      }
      return
    }
    if (selectedFolderItem.type === 'shortcut') {
      const ok = await window.api.restoreShortcutIcon?.(selectedFolderItem.path)
      if (ok) {
        setFolders((prev) => prev.map((p) => (p.path === selectedFolderItem.path ? { ...p, status: '待处理' } : p)))
        setAppliedIcons((prev) => { const n = { ...prev }; delete n[selectedFolderItem.path]; return n })
      } else {
        alert('还原失败')
      }
      return
    }
    alert('功能待开发')
  }, [selectedFolderItem, folder])
  const handleSmartMatch = useCallback(() => {
    if (!selectedFolderItem) return
    if (selectedFolderItem.type !== 'folder') { alert('功能待开发'); return }
    const list = recommendationsLib
    if (!list.length) { alert('图标库为空或无匹配项'); return }
    const idx = recommendCycleIndex % list.length
    const chosen = list[idx]
    setRecommendFilterActive(true)
    setSelectedLibraryIndex(idx)
    setIcon(chosen.path)
    setRecommendCycleIndex((prev) => (prev + 1) % list.length)
  }, [selectedFolderItem, recommendationsLib, recommendCycleIndex])
  const handleClickRecommendation = useCallback((path: string) => { const idx = libraryIcons.findIndex((li) => li.path === path); setSelectedLibraryIndex(idx >= 0 ? idx : null); setIcon(path) }, [libraryIcons])
  const handleBatchApply = useCallback(async () => {
    if (!icon || !selectedFolderPaths.length) return
    const targets = selectedFolderPaths.filter((p) => { const it = folders.find((f) => f.path === p); return it?.type === 'folder' })
    if (!targets.length) { alert('仅支持文件夹类型，功能待开发'); return }
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
    const targets = selectedFolderPaths.filter((p) => { const it = folders.find((f) => f.path === p); return it?.type === 'folder' })
    if (!targets.length) { alert('仅支持文件夹类型，功能待开发'); return }
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
    const targets = selectedFolderPaths.filter((p) => { const it = folders.find((f) => f.path === p); return it?.type === 'folder' })
    if (!targets.length) { alert('仅支持文件夹类型，功能待开发'); return }
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
    <>
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
        onSettingsClick={() => { alert('设置：功能待开发') }}
      />

      <div className="flex-1 flex overflow-hidden">
        <TargetsSidebar
          viewItems={viewItems}
          allCount={folders.length}
          typeFilter={typeFilter}
          onTypeFilterChange={(v) => setTypeFilter(v as any)}
          selectedFolderItem={selectedFolderItem}
          selectedFolderPaths={selectedFolderPaths}
          folderThumbs={folderThumbs}
          typeEmoji={typeEmoji}
          typeLabel={typeLabel}
          typeIcon={typeIcon}
          typeBadgeClass={typeBadgeClass}
          onSelectItem={(f) => { setSelectedFolderItem(f); if (f.type === 'folder') setFolder(f.path); else setFolder('') }}
          onToggleSelect={(path, checked) => { setSelectedFolderPaths((prev) => { if (checked) return prev.includes(path) ? prev : [...prev, path]; return prev.filter((p) => p !== path) }) }}
          onToggleSelectAll={(checked) => { if (checked) setSelectedFolderPaths(viewItems.map((f) => f.path)); else setSelectedFolderPaths([]) }}
          onDeleteItem={(path) => { setFolders((prev) => prev.filter((p) => p.path !== path)); setFolder((prev) => (prev === path ? '' : prev)); setSelectedFolderItem((prev) => (prev?.path === path ? null : prev)); setSelectedFolderPaths((prev) => prev.filter((p) => p !== path)); setFolderThumbs((prev) => { const n = { ...prev }; delete n[path]; return n }) }}
          onAddFolders={async () => { const arr = (await window.api.pickFolders?.()) || []; if (!arr.length) { const f = await window.api.pickFolder(); if (!f) return; const name = f.replace(/\\+/g, '/').split('/').filter(Boolean).pop() || 'Folder'; const item = { type: 'folder' as const, name, path: f, icon: '📁', status: '待处理' as const }; setFolders((prev) => { const exists = prev.some((p) => p.path === f); return exists ? prev : [item, ...prev] }); setSelectedFolderItem(item); setFolder(f); return } const items = arr.map((f) => { const name = f.replace(/\\+/g, '/').split('/').filter(Boolean).pop() || 'Folder'; return { type: 'folder' as const, name, path: f, icon: '📁', status: '待处理' as const } }); setFolders((prev) => { const set = new Set(prev.map((p) => p.path)); const merged = items.filter((it) => !set.has(it.path)); return merged.length ? [...merged, ...prev] : prev }); setSelectedFolderItem(items[0] || null); setFolder(items[0]?.path || '') }}
          onAddShortcut={async () => { const p = await window.api.pickShortcut?.(); if (!p) { alert('未选择快捷方式'); return } const name = p.replace(/\\+/g, '/').split('/').filter(Boolean).pop() || 'Shortcut'; const item = { type: 'shortcut' as const, name, path: p, icon: '🔗', status: '待处理' as const }; setFolders((prev) => (prev.some((it) => it.path === item.path) ? prev : [item, ...prev])); setSelectedFolderItem(item); setFolder('') }}
          onAddApplication={() => { const item = { type: 'application' as const, name: '示例应用', path: 'C:\\Program Files\\Example\\app.exe', icon: '💻', status: '待处理' as const }; setFolders((prev) => (prev.some((p) => p.path === item.path) ? prev : [item, ...prev])); setSelectedFolderItem(item); setFolder(''); alert('添加应用程序：功能待开发') }}
          onAddFiletype={() => { const item = { type: 'filetype' as const, name: 'PDF 文件类型', path: 'filetype:.pdf', ext: '.pdf', icon: '📄', status: '待处理' as const }; setFolders((prev) => (prev.some((p) => p.path === item.path) ? prev : [item, ...prev])); setSelectedFolderItem(item); setFolder(''); alert('添加文件类型：功能待开发') }}
        />

        <div className="flex-1 overflow-y-auto p-6">
          <LibraryToolbar
            onImportIcons={pickIcon}
            onOpenLibrary={async () => { await window.api.openIconLibraryFolder() }}
            onRefresh={async () => { const res = await window.api.resetIconLibraryPath(); if (res.ok) await loadLibrary() }}
            onClearFilter={() => { setRecommendFilterActive(false); setSearchQuery(''); setLibraryPage(1) }}
            canClear={!!(recommendFilterActive || searchQuery)}
          />

          <IconLibraryGrid
            libraryLoading={libraryLoading}
            pageItems={pageItems}
            thumbs={thumbs}
            icon={icon}
            isApplied={isApplied}
            onSelectIcon={(p) => setIcon(p)}
            onApplyOrRestore={handleGridApplyOrRestore}
            empty={libraryIcons.length === 0}
            libraryPage={libraryPage}
            pageCount={pageCount}
            filteredCount={filteredLib.length}
            onFirstPage={() => setLibraryPage(1)}
            onPrevPage={() => setLibraryPage((p) => Math.max(1, p - 1))}
            onNextPage={() => setLibraryPage((p) => Math.min(pageCount, p + 1))}
            onLastPage={() => setLibraryPage(pageCount)}
          />
        </div>

        <PreviewPanel
          selectedFolderItem={selectedFolderItem}
          folderPreview={folderPreview}
          typeEmoji={typeEmoji}
          iconPreview={iconPreview}
          icon={icon}
          folder={folder}
          onApplyIcon={handleApplyIcon}
          onRestore={handleRestore}
          onSmartMatch={handleSmartMatch}
          recommendations={selectedFolderItem?.type === 'folder' ? (recommendations.length ? recommendations : []) : []}
          thumbs={thumbs}
          onClickRecommendation={handleClickRecommendation}
        />
      </div>

      <BatchActionsBar
        selectedCount={selectedFolderPaths.length}
        totalCount={folders.length}
        onBatchApply={handleBatchApply}
        onBatchMatch={handleBatchMatch}
        onBatchRestore={handleBatchRestore}
        onBatchDelete={handleBatchDelete}
      />
    </div>
    <BatchPreviewModal
      open={batchPreviewOpen}
      mode={batchPreviewMode}
      candidates={batchCandidates}
      folderThumbs={folderThumbs}
      thumbs={thumbs}
      onCancel={() => { setBatchPreviewOpen(false) }}
      onToggleCheck={(folder, checked) => { setBatchCandidates((prev) => prev.map((it) => (it.folder === folder ? { ...it, checked: !!checked } : it))) }}
      onToggleCheckAll={(checked) => { if (!batchCandidates.length) return; setBatchCandidates((prev) => prev.map((it) => ({ ...it, checked: !!checked }))) }}
      onConfirm={async () => { const targets = batchCandidates.filter((c) => c.checked); if (!targets.length) { setBatchPreviewOpen(false); return } if (batchPreviewMode === 'restore') { const success: string[] = []; for (const c of targets) { const ok = await window.api.restoreIcon(c.folder); if (ok) success.push(c.folder) } if (success.length) { setFolders((prev) => prev.map((f) => (success.includes(f.path) ? { ...f, status: '待处理' } : f))); setFolderThumbs((prev) => { const n = { ...prev }; success.forEach((p) => { n[p] = '' }); return n }); setAppliedIcons((prev) => { const n = { ...prev }; success.forEach((p) => { delete n[p] }); return n }); setFolder((prev) => prev); if (success.includes(folder)) { const res = await window.api.getFolderPreview(folder); setFolderPreview(res.ok ? res : null) } } setBatchPreviewOpen(false); return } const results: { p: string; ok: boolean; thumb?: string; applied?: string }[] = []; for (const c of targets) { const ok = await window.api.applyIcon(c.folder, c.iconPath); let thumb = ''; if (ok) { const res = await window.api.getFolderPreview(c.folder); thumb = res.ok ? res.iconDataUrl : '' } results.push({ p: c.folder, ok, thumb, applied: c.iconPath }) } const success = results.filter((r) => r.ok); if (success.length) { const successPaths = success.map((r) => r.p); setFolders((prev) => prev.map((f) => (successPaths.includes(f.path) ? { ...f, status: '已修改' } : f))); setFolderThumbs((prev) => { const n = { ...prev }; success.forEach((r) => { n[r.p] = r.thumb || '' }); return n }); setAppliedIcons((prev) => { const n = { ...prev }; success.forEach((r) => { if (r.applied) n[r.p] = r.applied }); return n }) } setBatchPreviewOpen(false) }}
    />
    </>
)
}