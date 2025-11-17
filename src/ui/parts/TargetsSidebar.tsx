import React from 'react'
import { MacScrollbar } from 'mac-scrollbar'
import clsx from 'clsx'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Folder, Link2, AppWindow, FileText, Grid3x3 } from 'lucide-react'

type Item = { type: 'folder' | 'shortcut' | 'application' | 'filetype'; name: string; path: string; ext?: string; icon: string; status: '已修改' | '待处理' }

type Props = {
  viewItems: Item[]
  allCount: number
  typeFilter: 'all' | 'folder' | 'shortcut' | 'application' | 'filetype'
  onTypeFilterChange: (v: 'all' | 'folder' | 'shortcut' | 'application' | 'filetype') => void
  selectedFolderItem: Item | null
  selectedFolderPaths: string[]
  itemThumbs: Record<string, string>
  folderThumbs: Record<string, string>
  typeEmoji: Record<'folder' | 'shortcut' | 'application' | 'filetype', string>
  typeLabel: Record<'folder' | 'shortcut' | 'application' | 'filetype', string>
  typeIcon: Record<'folder' | 'shortcut' | 'application' | 'filetype', React.ComponentType<{ className?: string }>>
  typeBadgeClass: (t: 'folder' | 'shortcut' | 'application' | 'filetype') => string
  onSelectItem: (item: Item) => void
  onToggleSelect: (path: string, checked: boolean) => void
  onToggleSelectAll: (checked: boolean) => void
  onDeleteItem: (path: string) => void
  onAddFolders: () => void | Promise<void>
  onAddShortcut: () => void | Promise<void>
  onAddApplication: () => void
  onAddFiletype: () => void
  isDark: boolean
  locale?: 'zh' | 'en'
}

export default function TargetsSidebar(props: Props) {
  const { viewItems, allCount, typeFilter, onTypeFilterChange, selectedFolderItem, selectedFolderPaths, itemThumbs, folderThumbs, typeEmoji, typeLabel, typeIcon, typeBadgeClass, onSelectItem, onToggleSelect, onToggleSelectAll, onDeleteItem, onAddFolders, onAddShortcut, onAddApplication, onAddFiletype, isDark, locale = 'zh' } = props
  const t = (zh: string, en: string) => (locale === 'zh' ? zh : en)
  const allChecked = viewItems.length !== 0 && viewItems.every((f) => selectedFolderPaths.includes(f.path))
  const someChecked = viewItems.some((f) => selectedFolderPaths.includes(f.path))
  const triState = viewItems.length === 0 ? false : allChecked ? true : someChecked ? 'indeterminate' : false
  return (
    <MacScrollbar className="w-64 bg-card border-r border-border" suppressScrollX skin={isDark ? 'dark' : 'light'}>
      <div className="p-4">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center justify-between">
          <span>{t('待处理项目', 'Pending Items')}</span>
          <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">{allCount}</span>
        </h3>
        <div className="mb-3">
          <Select value={typeFilter} onValueChange={(v) => onTypeFilterChange(v as any)}>
            <SelectTrigger className="w-full text-xs">
              <SelectValue placeholder={t('全部类型', 'All Types')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all"><span className="inline-flex items-center gap-2"><Grid3x3 className="w-4 h-4" />{t('全部类型', 'All Types')}</span></SelectItem>
              <SelectItem value="folder"><span className="inline-flex items-center gap-2"><Folder className="w-4 h-4" />{t('文件夹', 'Folders')}</span></SelectItem>
              <SelectItem value="shortcut"><span className="inline-flex items-center gap-2"><Link2 className="w-4 h-4" />{t('快捷方式(.lnk)', 'Shortcuts (.lnk)')}</span></SelectItem>
              <SelectItem value="application"><span className="inline-flex items-center gap-2"><AppWindow className="w-4 h-4" />{t('应用程序(.exe)', 'Applications (.exe)')}</span></SelectItem>
              <SelectItem value="filetype"><span className="inline-flex items-center gap-2"><FileText className="w-4 h-4" />{t('文件类型(.pdf, .txt)', 'File Types (.pdf, .txt)')}</span></SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <Checkbox checked={triState} onCheckedChange={(checked) => { onToggleSelectAll(!!checked) }} />
          <span className="text-xs text-gray-600 dark:text-gray-400">{t('全选', 'Select All')}</span>
        </div>
        <div className="space-y-2">
          {viewItems.map((f, idx) => (
            <div key={idx} onClick={() => { onSelectItem(f) }} className={clsx('p-3 rounded-lg border cursor-pointer transition-all', selectedFolderItem?.path === f.path ? 'border-ring bg-muted' : 'border-border hover:bg-muted')}>
              <div className="flex items-center gap-2 mb-1">
                <Checkbox checked={selectedFolderPaths.includes(f.path)} onCheckedChange={(checked) => { onToggleSelect(f.path, !!checked) }} onClick={(e) => e.stopPropagation()} />
                {(f.type === 'folder' ? folderThumbs[f.path] : itemThumbs[f.path]) ? (
                  <img src={(f.type === 'folder' ? folderThumbs[f.path] : itemThumbs[f.path])} alt={f.name} className="w-6 h-6 object-contain" />
                ) : (
                  <span className="text-2xl">{typeEmoji[f.type]}</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-800 dark:text-white truncate">{f.name}</div>
                  <div className="text-xs text-gray-500 truncate">{f.type === 'filetype' ? (f.ext || '') : f.path}</div>
                </div>
                {selectedFolderItem?.path === f.path ? (
                  <Button variant="destructive" size="xs" onClick={(e) => { e.stopPropagation(); onDeleteItem(f.path) }} className="ml-2">{t('删除', 'Delete')}</Button>
                ) : null}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{locale === 'zh' ? f.status : (f.status === '已修改' ? 'Modified' : 'Pending')}</Badge>
                <Badge variant="outline" className={clsx('rounded-full', typeBadgeClass(f.type))}>
                  {(() => { const Icon = typeIcon[f.type]; return <Icon className="w-3.5 h-3.5" /> })()}
                  <span className="ml-1">{locale === 'zh' ? typeLabel[f.type] : (f.type === 'folder' ? 'Folder' : f.type === 'shortcut' ? 'Shortcut' : f.type === 'application' ? 'Application' : 'File Type')}</span>
                </Badge>
              </div>
            </div>
          ))}
          {viewItems.length === 0 ? (<div className="text-center text-xs text-gray-500 dark:text-gray-400 py-12">{t('暂无待处理项目', 'No pending items')}</div>) : null}
        </div>
        <div className="flex flex-col gap-2 mt-4">
          <Button variant="outline" onClick={onAddFolders} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs">
            <Folder className="w-4 h-4" />
            <span className="text-xs text-gray-600 dark:text-gray-400">{t('添加文件夹', 'Add Folders')}</span>
          </Button>
          <Button variant="outline" onClick={onAddShortcut} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs">
            <Link2 className="w-4 h-4" />
            <span className="text-xs text-gray-600 dark:text-gray-400">{t('添加快捷方式', 'Add Shortcuts')}</span>
          </Button>
          <Button variant="outline" onClick={onAddApplication} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs">
            <AppWindow className="w-4 h-4" />
            <span className="text-xs text-gray-600 dark:text-gray-400">{t('添加应用程序', 'Add Applications')}</span>
          </Button>
          <Button variant="outline" onClick={onAddFiletype} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs">
            <FileText className="w-4 h-4" />
            <span className="text-xs text-gray-600 dark:text-gray-400">{t('添加文件类型', 'Add File Types')}</span>
          </Button>
        </div>
      </div>
    </MacScrollbar>
  )
}