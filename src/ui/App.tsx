import React, { useState, useCallback, useEffect } from 'react'
import clsx from 'clsx'
import { Folder, Image, Settings, Search, Star, Grid3x3, List, Clock, Sparkles, Heart, Plus } from 'lucide-react'

declare global {
  interface Window {
    api: {
      pickFolder: () => Promise<string>
      pickIcon: () => Promise<string>
      applyIcon: (folder: string, icon: string) => Promise<boolean>
      getIconPreview: (iconPath: string) => Promise<{ ok: boolean; dataUrl: string }>
      getFolderPreview: (
        folderPath: string
      ) => Promise<{ ok: boolean; hasDesktopIni: boolean; hasFolderIco: boolean; iconPath: string; iconDataUrl: string }>
    }
  }
}

export default function App() {
  const [folder, setFolder] = useState('')
  const [icon, setIcon] = useState('')
  const [iconPreview, setIconPreview] = useState('')
  const [folderPreview, setFolderPreview] = useState<{ ok: boolean; hasDesktopIni: boolean; hasFolderIco: boolean; iconPath: string; iconDataUrl: string } | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolderItem, setSelectedFolderItem] = useState<{ name: string; path: string; icon: string; status: '已修改' | '待处理' } | null>(null)
  const [folders, setFolders] = useState<Array<{ name: string; path: string; icon: string; status: '已修改' | '待处理' }>>([
    { name: 'Projects', path: 'D:\\Projects', icon: '📁', status: '已修改' },
    { name: 'Documents', path: 'C:\\Users\\Documents', icon: '📄', status: '待处理' },
    { name: 'Downloads', path: 'C:\\Users\\Downloads', icon: '⬇️', status: '已修改' }
  ])
  const [selectedLibraryIndex, setSelectedLibraryIndex] = useState<number | null>(null)

  const iconCategories = [
    { name: '全部', count: 5230 },
    { name: '收藏', count: 48, icon: Star },
    { name: '办公', count: 820 },
    { name: '开发', count: 650 },
    { name: '设计', count: 540 },
    { name: '娱乐', count: 430 },
    { name: '系统', count: 380 },
    { name: '最近使用', count: 12, icon: Clock }
  ]

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
    if (i) setIcon(i)
  }, [])

  const apply = useCallback(async () => {
    const ok = await window.api.applyIcon(folder, icon)
    alert(ok ? '已应用' : '失败')
    if (ok && selectedFolderItem) {
      setFolders((prev) => prev.map((p) => (p.path === selectedFolderItem.path ? { ...p, status: '已修改' } : p)))
      setSelectedFolderItem((prev) => (prev ? { ...prev, status: '已修改' } : prev))
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

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800" onDrop={onDrop} onDragOver={onDragOver}>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Folder className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">文件夹图标管理器</h1>
              <p className="text-xs text-gray-500">智能管理你的文件夹图标</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索图标..."
                className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
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
                    <span className="text-2xl">{f.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-800 dark:text-white truncate">{f.name}</div>
                      <div className="text-xs text-gray-500 truncate">{f.path}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full', f.status === '已修改' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400')}>{f.status}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={pickFolder}
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
              <div className="flex items-center gap-2">
                {iconCategories.slice(0, 6).map((cat) => (
                  <button key={cat.name} className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-gray-700 transition-colors">
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={clsx('p-2 rounded-lg transition-colors', viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700')}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={clsx('p-2 rounded-lg transition-colors', viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700')}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={pickIcon}
                className="ml-2 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                导入图标(.ico)
              </button>
            </div>
          </div>

          <div className={viewMode === 'grid' ? 'grid grid-cols-8 gap-4' : 'space-y-2'}>
            {[...Array(32)].map((_, i) => (
              <div
                key={i}
                onClick={() => setSelectedLibraryIndex(i)}
                className={clsx(
                  'group relative bg-white dark:bg-gray-800 rounded-xl p-4 hover:shadow-xl hover:scale-105 transition-all cursor-pointer border border-gray-200 dark:border-gray-700',
                  selectedLibraryIndex === i && 'ring-2 ring-blue-500'
                )}
              >
                <div className="aspect-square flex items-center justify-center text-4xl mb-2">
                  {['📁', '📂', '🗂️', '📊', '💼', '🎨', '⚙️', '🎮'][i % 8]}
                </div>
                <div className="text-xs text-center text-gray-600 dark:text-gray-400 truncate">图标 {i + 1}</div>
                <button className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-700 rounded-full p-1 shadow-lg">
                  <Heart className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="w-80 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-6">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">实时预览</h3>

            <div className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-8 mb-4 aspect-square flex items-center justify-center">
              <div className="text-center">
                <div className="text-8xl mb-4">{selectedFolderItem?.icon || '📁'}</div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedFolderItem?.name || '未选择'}</div>
              </div>
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
                  onClick={() => {
                    // 功能待开发：还原图标（删除 desktop.ini 与 .folder.ico 并刷新缓存）
                    alert('还原：功能待开发')
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
            <span>已选择: <strong className="text-blue-600 dark:text-blue-400">{selectedFolderItem ? 1 : 0}</strong> 个文件夹</span>
            <span>|</span>
            <span>共管理: <strong>{folders.length}</strong> 个文件夹</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // 功能待开发：批量应用选中文件夹与选中图标
                alert('批量应用：功能待开发')
              }}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
            >
              批量应用
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}