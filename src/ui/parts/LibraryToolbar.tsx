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
  locale?: 'zh' | 'en'
}

export default function LibraryToolbar(props: Props) {
  const { onImportIcons, onConvertPng, onImportFromExe, onOpenLibrary, onRefresh, onClearFilter, canClear, locale = 'zh' } = props
  const t = (zh: string, en: string) => (locale === 'zh' ? zh : en)
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white">{t('图标库', 'Icon Library')}</h2>
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-2 text-xs cursor-default">{t('导入图标', 'Import Icons')}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-40" align="start">
            <DropdownMenuLabel>{t('导入方式', 'Import Methods')}</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={onImportIcons}>{t('导入ico', 'Import .ico')}</DropdownMenuItem>
              <DropdownMenuItem onSelect={onConvertPng}>{t('PNG转换', 'PNG to ICO')}</DropdownMenuItem>
              <DropdownMenuItem onSelect={onImportFromExe}>{t('从exe/dll提取', 'Extract from exe/dll')}</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" onClick={onOpenLibrary} className="text-xs">{t('打开图标库文件夹', 'Open Library Folder')}</Button>
        <Button variant="outline" size="icon" onClick={onRefresh} aria-label={t('刷新', 'Refresh')}>
          <RefreshCw className="w-4 h-4" />
        </Button>
        <Button variant="outline" onClick={onClearFilter} disabled={!canClear} className="text-xs">{t('清除筛选', 'Clear Filters')}</Button>
      </div>
    </div>
  )
}