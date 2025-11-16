import React, { useState, useCallback, useEffect } from 'react'
import clsx from 'clsx'
import { Folder, Settings, Search, Sparkles, Plus, Minus, Maximize, Square, X, Check } from 'lucide-react'

declare global {
  interface Window {
    api: {
      pickFolder: () => Promise<string>
      pickFolders: () => Promise<string[]>
      pickIcon: () => Promise<string>
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

  const loadLibrary = useCallback(async () => {
    const res = await window.api.listIcons()
    if (!res.ok) return
    setLibraryIcons(res.items)
  }, [])

  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])

  useEffect(() => {
    let mounted = true
    window.api.windowIsMaximized?.().then((v) => {
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
    const i = await window.api.pickIcon()
    if (!i) return
    const r = await window.api.importIcon(i)
    if (r.ok) {
      setIcon(r.dest)
      loadLibrary()
    }
  }, [])

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
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800" onDrop={onDrop} onDragOver={onDragOver}>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-3 window-drag" onDoubleClick={async () => { await window.api.windowToggleMaximize?.(); const v = await window.api.windowIsMaximized?.(); setIsMaximized(!!v) }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Folder className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">文件夹图标管理器</h1>
              <p className="text-xs text-gray-500">智能管理你的文件夹图标</p>
            </div>
          </div>

          <div className="flex items-center gap-3 no-drag">
            <div className="relative no-drag">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索图标..."
                className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => {
                // 功能待开发：设置与图标库目录选择
                alert('设置：功能待开发')
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <label className="switch" aria-label="主题切换">
              <input id="theme-toggle-input" type="checkbox" checked={isDark} onChange={() => setIsDark((v) => !v)} />
              <div className="slider round">
                <div className="sun-moon">
                  <svg id="moon-dot-1" className="moon-dot" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"></circle></svg>
                  <svg id="moon-dot-2" className="moon-dot" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"></circle></svg>
                  <svg id="moon-dot-3" className="moon-dot" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"></circle></svg>
                  <svg id="light-ray-1" className="light-ray" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"></circle></svg>
                  <svg id="light-ray-2" className="light-ray" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"></circle></svg>
                  <svg id="light-ray-3" className="light-ray" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"></circle></svg>
                  <svg id="cloud-1" className="cloud-dark" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"></circle></svg>
                  <svg id="cloud-2" className="cloud-dark" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"></circle></svg>
                  <svg id="cloud-3" className="cloud-dark" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"></circle></svg>
                  <svg id="cloud-4" className="cloud-light" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"></circle></svg>
                  <svg id="cloud-5" className="cloud-light" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"></circle></svg>
                  <svg id="cloud-6" className="cloud-light" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"></circle></svg>
                </div>
                <div className="stars">
                  <svg id="star-1" className="star" viewBox="0 0 20 20"><path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path></svg>
                  <svg id="star-2" className="star" viewBox="0 0 20 20"><path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path></svg>
                  <svg id="star-3" className="star" viewBox="0 0 20 20"><path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path></svg>
                  <svg id="star-4" className="star" viewBox="0 0 20 20"><path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path></svg>
                </div>
              </div>
            </label>
            <div className="flex items-center gap-1">
              <button onClick={async () => { await window.api.windowMinimize?.() }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <Minus className="w-4 h-4" />
              </button>
              <button onClick={async () => { await window.api.windowToggleMaximize?.(); const v = await window.api.windowIsMaximized?.(); setIsMaximized(!!v) }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                {isMaximized ? <Square className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
              <button onClick={async () => { await window.api.windowClose?.() }} className="p-2 hover:bg-red-100 dark:hover:bg-red-800 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center justify-between">
              <span>待处理文件夹</span>
              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-2 py-1 rounded-full">{folders.length}</span>
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
                    selectedFolderItem?.path === f.path ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="checkbox"
                      checked={selectedFolderPaths.includes(f.path)}
                      onChange={(e) => {
                        e.stopPropagation()
                        setSelectedFolderPaths((prev) => {
                          if (e.target.checked) return prev.includes(f.path) ? prev : [...prev, f.path]
                          return prev.filter((p) => p !== f.path)
                        })
                      }}
                      className="w-4 h-4 border-gray-300 rounded"
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
                      <button
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
                        className="ml-2 px-2 py-1 text-xs text-red-600 border border-red-300 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        删除
                      </button>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full', f.status === '已修改' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400')}>{f.status}</span>
                  </div>
                </div>
              ))}
              {folders.length === 0 ? (
                <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-12">暂无待处理文件夹，点击下方“添加文件夹”或拖拽文件夹到页面</div>
              ) : null}
            </div>

            <button
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
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
            >
              <Plus className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">添加文件夹</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">图标库</h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={pickIcon}
                className="ml-2 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                导入图标(.ico)
              </button>
              <button
                onClick={async () => {
                  await window.api.openIconLibraryFolder()
                }}
                className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                查看图标库文件夹
              </button>
              <button
                onClick={async () => {
                  const res = await window.api.resetIconLibraryPath()
                  if (res.ok) {
                    await loadLibrary()
                  }
                }}
                className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                🔃刷新
              </button>
            </div>
          </div>

          <div className={'flex flex-wrap gap-4'}>
            {(libraryIcons.length ? libraryIcons.filter((it) => it.name.toLowerCase().includes(searchQuery.toLowerCase())) : []).map((it, i) => (
              <div
                key={it.path}
                onClick={() => {
                  setSelectedLibraryIndex(i)
                  setIcon(it.path)
                }}
                className={clsx(
                  'group relative bg-white dark:bg-gray-800 rounded-xl p-4 hover:shadow-xl hover:scale-105 transition-all cursor-pointer border border-gray-200 dark:border-gray-700 w-[120px]',
                  selectedLibraryIndex === i && 'ring-2 ring-blue-500'
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
                <button
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
                      ? 'bg-green-500 text-white min-w-[34px] h-6'
                      : 'bg-transparent border border-blue-600 text-blue-600 min-w-[34px] h-6 text-[9px]'
                  )}
                >
                  {selectedFolderItem && appliedIcons[selectedFolderItem.path] === it.path ? (
                    <Check className="w-3 h-3 apply-btn-check" />
                  ) : (
                    <span className="apply-btn-text">应用</span>
                  )}
                </button>
              </div>
            ))}
            {libraryIcons.length === 0 ? (
              <div className="col-span-8 text-center text-sm text-gray-500 dark:text-gray-400 py-8">图标库为空，点击“导入图标(.ico)”进行导入</div>
            ) : null}
          </div>
        </div>

        <div className="w-80 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-6">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">实时预览</h3>

            <div className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-8 mb-4 aspect-square flex items-center justify-center">
              {folderPreview?.iconDataUrl ? (
                <img src={folderPreview.iconDataUrl} alt={selectedFolderItem?.name || ''} className="w-24 h-24 object-contain" />
              ) : (
                <div className="text-center">
                  <div className="text-8xl mb-4">📁</div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">文件夹路径</div>
                <div className="text-sm text-gray-800 dark:text-white font-mono break-all">{folder || '未选择'}</div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">当前图标</div>
                <div className="flex items-center gap-2">
                  {iconPreview ? (
                    <img src={iconPreview} alt="icon" className="w-10 h-10 object-contain" />
                  ) : (
                    <span className="text-3xl">📁</span>
                  )}
                  <div className="text-sm text-gray-800 dark:text-white">{icon ? icon.split(/\\|\//).pop() : '未选择图标(.ico)'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={!folder || !icon}
                  onClick={apply}
                  className={clsx('px-4 py-2.5 rounded-lg text-sm font-medium text-white', !folder || !icon ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:shadow-lg transition-all')}
                >
                  应用图标
                </button>
                <button
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
                  className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm font-medium"
                >
                  还原
                </button>
              </div>

              <button
                onClick={() => {
                  // 功能待开发：AI智能推荐（基于文件夹名称/分类推荐合适图标）
                  alert('AI智能推荐：功能待开发')
                }}
                className="w-full px-4 py-2.5 bg-purple-500 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                AI智能推荐
              </button>
            </div>

            <div className="mt-6">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3">相似推荐</h4>
              <div className="grid grid-cols-4 gap-2">
                {['📂', '🗂️', '📊', '💼', '🎨', '⚙️', '🎮', '📝'].map((em, i) => (
                  <button key={i} className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-2xl hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors">
                    {em}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>已选择: <strong className="text-blue-600 dark:text-blue-400">{selectedFolderPaths.length}</strong> 个文件夹</span>
            <span>|</span>
            <span>共管理: <strong>{folders.length}</strong> 个文件夹</span>
          </div>

          <div className="flex items-center gap-2">
            <button
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
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
            >
              批量应用
            </button>
            <button
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
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm font-medium"
            >
              批量还原
            </button>
            <button
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
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
            >
              批量删除
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}