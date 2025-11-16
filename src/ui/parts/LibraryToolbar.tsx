import React from 'react'
import { Button } from '../../components/ui/button'

type Props = {
  onImportIcons: () => void | Promise<void>
  onImportFromExe?: () => void | Promise<void>
  onOpenLibrary: () => void | Promise<void>
  onRefresh: () => void | Promise<void>
  onClearFilter: () => void
  canClear: boolean
}

export default function LibraryToolbar(props: Props) {
  const { onImportIcons, onImportFromExe, onOpenLibrary, onRefresh, onClearFilter, canClear } = props
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white">图标库</h2>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={onImportIcons} className="ml-2 text-xs">导入图标</Button>
        <Button variant="outline" onClick={onImportFromExe} className="text-xs">从EXE/DLL提取</Button>
        <Button variant="outline" onClick={onOpenLibrary} className="text-xs">打开图标库文件夹</Button>
        <Button variant="outline" onClick={onRefresh} className="text-xs">🔃刷新</Button>
        <Button variant="outline" onClick={onClearFilter} disabled={!canClear} className="text-xs">清除筛选</Button>
      </div>
    </div>
  )
}