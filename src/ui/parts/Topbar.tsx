import React from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Search, Settings, Minus, Maximize, Square, X, Folder } from 'lucide-react'

type Props = {
  searchQuery: string
  onSearchChange: (v: string) => void
  isDark: boolean
  onToggleDark: () => void
  isMaximized: boolean
  onMinimize: () => void | Promise<void>
  onToggleMaximize: () => void | Promise<void>
  onClose: () => void | Promise<void>
  onSettingsClick: () => void
}

export default function TopBar(props: Props) {
  const { searchQuery, onSearchChange, isDark, onToggleDark, isMaximized, onMinimize, onToggleMaximize, onClose, onSettingsClick } = props
  return (
    <div className="bg-card border-b border-border">
      <div className="flex items-center justify-between px-6 py-3 window-drag" onDoubleClick={() => onToggleMaximize()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted text-foreground flex items-center justify-center">
            <Folder className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">图标管理器</h1>
            <p className="text-xs text-gray-500">统一管理不同类型的图标</p>
          </div>
        </div>
        <div className="flex items-center gap-3 no-drag">
          <div className="relative no-drag">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input type="text" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder="搜索图标..." className="pl-10 pr-4 w-64" />
          </div>
          <Button variant="ghost" size="icon" onClick={onSettingsClick}>
            <Settings className="w-5 h-5" />
          </Button>
          <label className="toggle no-drag" aria-label="主题切换">
            <input type="checkbox" className="input" id="switch" checked={isDark} onChange={onToggleDark} />
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
            <Button variant="ghost" size="icon" onClick={onMinimize}>
              <Minus className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onToggleMaximize}>
              {isMaximized ? <Square className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}