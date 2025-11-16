import React, { useState, useCallback, useEffect } from 'react'
import clsx from 'clsx'
import { Folder, Settings, Search, Sparkles, Plus, Minus, Maximize, Square, X, Check } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Checkbox } from '../components/ui/checkbox'

declare global {
  interface Window {
    api: {
      pickFolder: () => Promise<string>
      pickFolders: () => Promise<string[]>
      pickIcon: () => Promise<string>
      pickIcons?: () => Promise<string[]>
      applyIcon: (folder: string, icon: string) => Promise<boolean>
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
  const [iconPreview, setIconPreview] = useState('')
  const [folderPreview, setFolderPreview] = useState<{ ok: boolean; hasDesktopIni: boolean; hasFolderIco: boolean; iconPath: string; iconDataUrl: string } | null>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolderItem, setSelectedFolderItem] = useState<{ name: string; path: string; icon: string; status: '已修改' | '待处理' } | null>(null)
  const [folders, setFolders] = useState<Array<{ name: string; path: string; icon: string; status: '已修改' | '待处理' }>>([
  //  { name: 'Projects', path: 'D:\\Projects', icon: '📁', status: '已修改' },
  //  { name: 'Documents', path: 'C:\\Users\\Documents', icon: '📄', status: '待处理' },
  //  { name: 'Downloads', path: 'C:\\Users\\Downloads', icon: '⬇️', status: '已修改' }
  ])
  const [selectedLibraryIndex, setSelectedLibraryIndex] = useState<number | null>(null)
  const [libraryIcons, setLibraryIcons] = useState<Array<{ name: string; path: string }>>([])
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [folderThumbs, setFolderThumbs] = useState<Record<string, string>>({})
  const [isMaximized, setIsMaximized] = useState(false)
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('theme')
      if (saved) return saved === 'dark'
      return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
    } catch {
      return false
    }
  })
  const [appliedIcons, setAppliedIcons] = useState<Record<string, string>>({})
  const [selectedFolderPaths, setSelectedFolderPaths] = useState<string[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)

  const loadLibrary = useCallback(async () => {
    setLibraryLoading(true)
    try {
      if (!window.api?.listIcons) {
        setLibraryIcons([])
        return
      }
      const res = await window.api.listIcons()
      if (!res.ok) return
      setLibraryIcons(res.items)
    } finally {
      setLibraryLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])

  useEffect(() => {
    let mounted = true
    window.api?.windowIsMaximized?.().then((v) => {
      if (!mounted) return
      setIsMaximized(!!v)
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (isDark) root.classList.add('dark')
    else root.classList.remove('dark')
    try { localStorage.setItem('theme', isDark ? 'dark' : 'light') } catch {}
  }, [isDark])

  useEffect(() => {
    let mounted = true
    const fetchThumbs = async () => {
      const pairs = await Promise.all(
        libraryIcons.map(async (it) => {
          const p = await window.api.getIconPreview(it.path)
          return [it.path, p.ok ? p.dataUrl : ''] as const
        })
      )
      if (!mounted) return
      const map: Record<string, string> = {}
      pairs.forEach(([k, v]) => { map[k] = v })
      setThumbs(map)
    }
    if (libraryIcons.length) fetchThumbs()
    else setThumbs({})
    return () => { mounted = false }
  }, [libraryIcons])



  const pickFolder = useCallback(async () => {
    const f = await window.api.pickFolder()
    if (!f) return
    setFolder(f)
    const name = f.replace(/\\+/g, '/').split('/').filter(Boolean).pop() || 'Folder'
    const item = { name, path: f, icon: '📁', status: '待处理' as const }
    setFolders((prev) => {
      const exists = prev.some((p) => p.path === f)
      return exists ? prev : [item, ...prev]
    })
    setSelectedFolderItem(item)
  }, [])

  const pickIcon = useCallback(async () => {
    setLibraryLoading(true)
    try {
      const arr = await window.api.pickIcons?.()
      if (arr && arr.length) {
        let last = ''
        for (const p of arr) {
          const r = await window.api.importIcon(p)
          if (r.ok) last = r.dest
        }
        if (last) setIcon(last)
        await loadLibrary()
        return
      }
      const i = await window.api.pickIcon()
      if (!i) return
      const r = await window.api.importIcon(i)
      if (r.ok) {
        setIcon(r.dest)
        await loadLibrary()
      }
    } finally {
      setLibraryLoading(false)
    }
  }, [loadLibrary])

  const apply = useCallback(async () => {
    const ok = await window.api.applyIcon(folder, icon)
    if (!ok) alert('失败')
    if (ok && selectedFolderItem) {
      setFolders((prev) => prev.map((p) => (p.path === selectedFolderItem.path ? { ...p, status: '已修改' } : p)))
      setSelectedFolderItem((prev) => (prev ? { ...prev, status: '已修改' } : prev))
      const res = await window.api.getFolderPreview(selectedFolderItem.path)
      setFolderPreview(res.ok ? res : null)
      setFolderThumbs((prev) => ({ ...prev, [selectedFolderItem.path]: res.ok ? res.iconDataUrl : '' }))
      setAppliedIcons((prev) => ({ ...prev, [selectedFolderItem.path]: icon }))
    }
  }, [folder, icon, selectedFolderItem])

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
      const item = { name, path: file.path, icon: '📁', status: '待处理' as const }
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

  useEffect(() => {
    let mounted = true
    if (!icon) {
      setIconPreview('')
      return
    }
    window.api.getIconPreview(icon).then((res) => {
      if (!mounted) return
      setIconPreview(res.ok ? res.dataUrl : '')
    })
    return () => {
      mounted = false
    }
  }, [icon])

  useEffect(() => {
    let mounted = true
    if (!folder) {
      setFolderPreview(null)
      return
    }
    window.api.getFolderPreview(folder).then((res) => {
      if (!mounted) return
      setFolderPreview(res)
    })
    return () => {
      mounted = false
    }
  }, [folder])

  useEffect(() => {
    let mounted = true
    const run = async () => {
      const pairs = await Promise.all(
        folders.map(async (f) => {
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

  return (
    <div className="flex flex-col h-screen bg-background" onDrop={onDrop} onDragOver={onDragOver}>
      <div className="bg-card border-b border-border">
        <div className="flex items-center justify-between px-6 py-3 window-drag" onDoubleClick={async () => { await window.api?.windowToggleMaximize?.(); const v = await window.api?.windowIsMaximized?.(); setIsMaximized(!!v) }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted text-foreground flex items-center justify-center">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">文件夹图标管理器</h1>
              <p className="text-xs text-gray-500">智能管理你的文件夹图标</p>
            </div>
          </div>

          <div className="flex items-center gap-3 no-drag">
            <div className="relative no-drag">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索图标..."
                className="pl-10 pr-4 w-64"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                alert('设置：功能待开发')
              }}
            >
              <Settings className="w-5 h-5" />
            </Button>
            <label className="toggle no-drag" aria-label="主题切换">
              <input type="checkbox" className="input" id="switch" checked={isDark} onChange={() => setIsDark((v) => !v)} />
              <div className="icon icon--moon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd"></path>
                </svg>
              </div>
              <div className="icon icon--sun">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"></path>
                </svg>
              </div>
            </label>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={async () => { await window.api?.windowMinimize?.() }}>
                <Minus className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={async () => { await window.api?.windowToggleMaximize?.(); const v = await window.api?.windowIsMaximized?.(); setIsMaximized(!!v) }}>
                {isMaximized ? <Square className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={async () => { await window.api?.windowClose?.() }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 bg-card border-r border-border overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center justify-between">
              <span>待处理文件夹</span>
              <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">{folders.length}</span>
            </h3>
            <div className="space-y-2">
              {folders.map((f, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedFolderItem(f)
                    setFolder(f.path)
                  }}
                  className={clsx(
                    'p-3 rounded-lg border cursor-pointer transition-all',
                    selectedFolderItem?.path === f.path ? 'border-ring bg-muted' : 'border-border hover:bg-muted'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Checkbox
                      checked={selectedFolderPaths.includes(f.path)}
                      onCheckedChange={(checked) => {
                        setSelectedFolderPaths((prev) => {
                          if (checked) return prev.includes(f.path) ? prev : [...prev, f.path]
                          return prev.filter((p) => p !== f.path)
                        })
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {folderThumbs[f.path] ? (
                      <img src={folderThumbs[f.path]} alt={f.name} className="w-6 h-6 object-contain" />
                    ) : (
                      <span className="text-2xl">📁</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-800 dark:text-white truncate">{f.name}</div>
                      <div className="text-xs text-gray-500 truncate">{f.path}</div>
                    </div>
                    {selectedFolderItem?.path === f.path ? (
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          setFolders((prev) => prev.filter((p) => p.path !== f.path))
                          setFolder((prev) => (prev === f.path ? '' : prev))
                          setSelectedFolderItem((prev) => (prev?.path === f.path ? null : prev))
                          setSelectedFolderPaths((prev) => prev.filter((p) => p !== f.path))
                          setFolderThumbs((prev) => {
                            const n = { ...prev }
                            delete n[f.path]
                            return n
                          })
                        }}
                        className="ml-2"
                      >
                        删除
                      </Button>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="outline">{f.status}</Badge>
                  </div>
                </div>
              ))}
              {folders.length === 0 ? (
                <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-12">暂无待处理文件夹，点击下方“添加文件夹”或拖拽文件夹到页面</div>
              ) : null}
            </div>

            <Button
              variant="outline"
              onClick={async () => {
                const arr = (await window.api.pickFolders?.()) || []
                if (!arr.length) {
                  const f = await window.api.pickFolder()
                  if (!f) return
                  const name = f.replace(/\+/g, '/').split('/').filter(Boolean).pop() || 'Folder'
                  const item = { name, path: f, icon: '📁', status: '待处理' as const }
                  setFolders((prev) => {
                    const exists = prev.some((p) => p.path === f)
                    return exists ? prev : [item, ...prev]
                  })
                  setSelectedFolderItem(item)
                  setFolder(f)
                  return
                }
                const items = arr.map((f) => {
                  const name = f.replace(/\+/g, '/').split('/').filter(Boolean).pop() || 'Folder'
                  return { name, path: f, icon: '📁', status: '待处理' as const }
                })
                setFolders((prev) => {
                  const set = new Set(prev.map((p) => p.path))
                  const merged = items.filter((it) => !set.has(it.path))
                  return merged.length ? [...merged, ...prev] : prev
                })
                setSelectedFolderItem(items[0] || null)
                setFolder(items[0]?.path || '')
              }}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3"
            >
              <Plus className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">添加文件夹</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">图标库</h2>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={pickIcon} className="ml-2 text-xs">
                导入图标
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await window.api.openIconLibraryFolder()
                }}
                className="text-xs"
              >
                打开图标库文件夹
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const res = await window.api.resetIconLibraryPath()
                  if (res.ok) {
                    await loadLibrary()
                  }
                }}
                className="text-xs"
              >
                🔃刷新
              </Button>
            </div>
          </div>

          <div className={'flex flex-wrap gap-4 min-h-[160px]'}>
            {libraryLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-card rounded-xl p-4 border border-border w-[120px]">
                  <div className="w-full aspect-square flex items-center justify-center mb-2">
                    <div className="w-12 h-12 rounded bg-muted animate-pulse" />
                  </div>
                  <div className="h-3 w-20 mx-auto rounded bg-muted animate-pulse" />
                </div>
              ))
            ) : (
              (libraryIcons.length ? libraryIcons.filter((it) => it.name.toLowerCase().includes(searchQuery.toLowerCase())) : []).map((it, i) => (
              <div
                key={it.path}
                onClick={() => {
                  setSelectedLibraryIndex(i)
                  setIcon(it.path)
                }}
                className={clsx(
                  'group relative bg-card rounded-xl p-4 hover:shadow-sm transition-all cursor-pointer border border-border w-[120px]',
                  selectedLibraryIndex === i && 'ring-2 ring-ring'
                )}
              >
                <div className="w-full aspect-square flex items-center justify-center text-4xl mb-2">
                  {thumbs[it.path] ? (
                    <img src={thumbs[it.path]} alt={it.name} className="w-12 h-12 object-contain" />
                  ) : (
                    <span>📁</span>
                  )}
                </div>
                <div className="text-xs text-center text-gray-600 dark:text-gray-400 truncate">{it.name}</div>
                <Button
                  onClick={async (e) => {
                    e.stopPropagation()
                    if (!selectedFolderItem) return
                    const already = appliedIcons[selectedFolderItem.path] === it.path
                    if (already) {
                      const ok = await window.api.restoreIcon(selectedFolderItem.path)
                      if (ok) {
                        setFolders((prev) => prev.map((p) => (p.path === selectedFolderItem.path ? { ...p, status: '待处理' } : p)))
                        const res = await window.api.getFolderPreview(selectedFolderItem.path)
                        setFolderPreview(res.ok ? res : null)
                        setFolderThumbs((prev) => ({ ...prev, [selectedFolderItem.path]: '' }))
                        setAppliedIcons((prev) => {
                          const n = { ...prev }
                          delete n[selectedFolderItem.path]
                          return n
                        })
                        setIcon('')
                      }
                    } else {
                      const ok = await window.api.applyIcon(selectedFolderItem.path, it.path)
                      if (ok) {
                        setIcon(it.path)
                        setFolders((prev) => prev.map((p) => (p.path === selectedFolderItem.path ? { ...p, status: '已修改' } : p)))
                        setSelectedFolderItem((prev) => (prev ? { ...prev, status: '已修改' } : prev))
                        const res = await window.api.getFolderPreview(selectedFolderItem.path)
                        setFolderPreview(res.ok ? res : null)
                        setFolderThumbs((prev) => ({ ...prev, [selectedFolderItem.path]: res.ok ? res.iconDataUrl : '' }))
                        setAppliedIcons((prev) => ({ ...prev, [selectedFolderItem.path]: it.path }))
                      } else {
                        alert('应用失败')
                      }
                    }
                  }}
                  title="应用此图标"
                  className={clsx(
                    'absolute top-2 right-2 opacity-0 group-hover:opacity-100 rounded-full transition-opacity transition-colors duration-200 ease-out flex items-center justify-center',
                    selectedFolderItem && appliedIcons[selectedFolderItem.path] === it.path
                      ? 'bg-muted text-foreground min-w-[50px] h-6 hover:ring-1 hover:ring-border'
                      : 'bg-transparent border border-border text-foreground min-w-[50px] h-6 text-[9px] hover:ring-1 hover:ring-border'
                  )}
                >
                  {selectedFolderItem && appliedIcons[selectedFolderItem.path] === it.path ? (
                    <Check className="w-3 h-3 apply-btn-check" />
                  ) : (
                    <span className="apply-btn-text">应用</span>
                  )}
                </Button>
              </div>
              ))
            )}
            {libraryIcons.length === 0 ? (
              <div className="col-span-8 text-center text-sm text-gray-500 dark:text-gray-400 py-8">图标库为空，点击“导入图标(.ico)”进行导入</div>
            ) : null}
          </div>
        </div>

        <div className="w-80 bg-card border-l border-border overflow-y-auto">
          <div className="p-6">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">实时预览</h3>

            <div className="bg-card rounded-2xl p-8 mb-4 aspect-square flex items-center justify-center">
              {folderPreview?.iconDataUrl ? (
                <img src={folderPreview.iconDataUrl} alt={selectedFolderItem?.name || ''} className="w-24 h-24 object-contain" />
              ) : (
                <div className="text-center">
                  <div className="text-8xl mb-4">📁</div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Card className="p-3">
                <CardHeader className="p-0 mb-1">
                  <CardTitle className="text-xs font-normal text-gray-500 dark:text-gray-400">文件夹路径</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="text-sm text-gray-800 dark:text-white font-mono break-all">{folder || '未选择'}</div>
                </CardContent>
              </Card>

              <Card className="p-3">
                <CardHeader className="p-0 mb-1">
                  <CardTitle className="text-xs font-normal text-gray-500 dark:text-gray-400">当前图标</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="flex items-center gap-2">
                    {iconPreview ? (
                      <img src={iconPreview} alt="icon" className="w-10 h-10 object-contain" />
                    ) : (
                      <span className="text-3xl">📁</span>
                    )}
                    <div className="text-sm text-gray-800 dark:text-white">{icon ? icon.split(/\\|\//).pop() : '未选择图标(.ico)'}</div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-2">
                <Button disabled={!folder || !icon} onClick={apply}>应用图标</Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!folder) return
                    const ok = await window.api.restoreIcon(folder)
                    if (ok) {
                      setFolders((prev) => prev.map((p) => (p.path === folder ? { ...p, status: '待处理' } : p)))
                      const res = await window.api.getFolderPreview(folder)
                      setFolderPreview(res.ok ? res : null)
                      setFolderThumbs((prev) => ({ ...prev, [folder]: '' }))
                      setAppliedIcons((prev) => {
                        const n = { ...prev }
                        delete n[folder]
                        return n
                      })
                    } else {
                      alert('还原失败')
                    }
                  }}
                >
                  还原
                </Button>
              </div>

              <Button
                onClick={() => {
                  // 功能待开发：AI智能推荐（基于文件夹名称/分类推荐合适图标）
                  alert('AI智能推荐：功能待开发')
                }}
                className="w-full"
              >
                <Sparkles className="w-4 h-4" />
                AI智能推荐
              </Button>
            </div>

            <div className="mt-6">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3">相似推荐</h4>
              <div className="grid grid-cols-4 gap-2">
                {['📂', '🗂️', '📊', '💼', '🎨', '⚙️', '🎮', '📝'].map((em, i) => (
                  <Button key={i} variant="secondary" className="aspect-square rounded-lg text-2xl">
                    {em}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border-t border-border px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>已选择: <strong className="text-foreground">{selectedFolderPaths.length}</strong> 个文件夹</span>
            <span>|</span>
            <span>共管理: <strong>{folders.length}</strong> 个文件夹</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={async () => {
                if (!icon || !selectedFolderPaths.length) return
                const targets = [...selectedFolderPaths]
                const results: { p: string; ok: boolean; thumb?: string }[] = []
                for (const p of targets) {
                  const ok = await window.api.applyIcon(p, icon)
                  let thumb = ''
                  if (ok) {
                    const res = await window.api.getFolderPreview(p)
                    thumb = res.ok ? res.iconDataUrl : ''
                  }
                  results.push({ p, ok, thumb })
                }
                const success = results.filter((r) => r.ok).map((r) => r.p)
                if (success.length) {
                  setFolders((prev) => prev.map((f) => (success.includes(f.path) ? { ...f, status: '已修改' } : f)))
                  setFolderThumbs((prev) => {
                    const n = { ...prev }
                    results.forEach((r) => {
                      if (r.ok) n[r.p] = r.thumb || ''
                    })
                    return n
                  })
                  setAppliedIcons((prev) => {
                    const n = { ...prev }
                    success.forEach((p) => { n[p] = icon })
                    return n
                  })
                }
              }}
              variant="outline"
              className="text-sm"
            >
              批量应用
            </Button>
            <Button
              onClick={async () => {
                if (!selectedFolderPaths.length) return
                const targets = [...selectedFolderPaths]
                const success: string[] = []
                for (const p of targets) {
                  const ok = await window.api.restoreIcon(p)
                  if (ok) success.push(p)
                }
                if (success.length) {
                  setFolders((prev) => prev.map((f) => (success.includes(f.path) ? { ...f, status: '待处理' } : f)))
                  setFolderThumbs((prev) => {
                    const n = { ...prev }
                    success.forEach((p) => { n[p] = '' })
                    return n
                  })
                  setAppliedIcons((prev) => {
                    const n = { ...prev }
                    success.forEach((p) => { delete n[p] })
                    return n
                  })
                  setFolder((prev) => prev)
                  if (success.includes(folder)) {
                    const res = await window.api.getFolderPreview(folder)
                    setFolderPreview(res.ok ? res : null)
                  }
                }
              }}
              variant="outline"
              className="text-sm"
            >
              批量还原
            </Button>
            <Button
              onClick={() => {
                if (!selectedFolderPaths.length) return
                const targets = new Set(selectedFolderPaths)
                setFolders((prev) => prev.filter((f) => !targets.has(f.path)))
                setSelectedFolderPaths([])
                setFolder((prev) => (targets.has(prev) ? '' : prev))
                setSelectedFolderItem((prev) => (prev && targets.has(prev.path) ? null : prev))
                setFolderThumbs((prev) => {
                  const n = { ...prev }
                  selectedFolderPaths.forEach((p) => { delete n[p] })
                  return n
                })
                setAppliedIcons((prev) => {
                  const n = { ...prev }
                  selectedFolderPaths.forEach((p) => { delete n[p] })
                  return n
                })
              }}
              variant="destructive"
              className="text-sm"
            >
              批量删除
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}