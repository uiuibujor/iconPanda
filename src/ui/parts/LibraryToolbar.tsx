import React from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuGroup, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { RefreshCw } from 'lucide-react'

type Props = {
  onImportIcons: () => void | Promise<void>
  onConvertPng?: () => void | Promise<void>
  onImportFromExe?: () => void | Promise<void>
  onOpenLibrary: () => void | Promise<void>
  onRefresh: () => void | Promise<void>
  onClearFilter: () => void
  canClear: boolean
}

export default function LibraryToolbar(props: Props) {
  const { onImportIcons, onConvertPng, onImportFromExe, onOpenLibrary, onRefresh, onClearFilter, canClear } = props
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white">图标库</h2>
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-2 text-xs cursor-default">导入图标</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-40" align="start">
            <DropdownMenuLabel>导入方式</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={onImportIcons}>导入ico</DropdownMenuItem>
              <DropdownMenuItem onSelect={onConvertPng}>PNG转换</DropdownMenuItem>
              <DropdownMenuItem onSelect={onImportFromExe}>从exe/dll提取</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" onClick={onOpenLibrary} className="text-xs">打开图标库文件夹</Button>
        <Button variant="outline" size="icon" onClick={onRefresh} aria-label="刷新">
          <RefreshCw className="w-4 h-4" />
        </Button>
        <Button variant="outline" onClick={onClearFilter} disabled={!canClear} className="text-xs">清除筛选</Button>
      </div>
    </div>
  )
}