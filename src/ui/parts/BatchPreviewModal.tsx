import React from 'react'
import { MacScrollbar } from 'mac-scrollbar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { OverflowTooltip } from '@/components/ui/tooltip'

type Candidate = { folder: string; name: string; iconPath: string; iconName: string; checked: boolean; exact: boolean }
type Mode = 'match' | 'apply' | 'restore'

type Props = {
  open: boolean
  mode: Mode
  candidates: Candidate[]
  folderThumbs: Record<string, string>
  itemThumbs?: Record<string, string>
  thumbs: Record<string, string>
  onCancel: () => void
  onConfirm: () => void | Promise<void>
  onToggleCheck: (folder: string, checked: boolean) => void
  onToggleCheckAll: (checked: boolean) => void
  locale?: 'zh' | 'en'
}

export default function BatchPreviewModal(props: Props) {
  const { open, mode, candidates, folderThumbs, itemThumbs, thumbs, onCancel, onConfirm, onToggleCheck, onToggleCheckAll, locale = 'zh' } = props
  const t = (zh: string, en: string) => (locale === 'zh' ? zh : en)
  if (!open) return null
  const allChecked = candidates.length !== 0 && candidates.every((c) => c.checked)
  const someChecked = candidates.some((c) => c.checked)
  const triState = candidates.length === 0 ? false : allChecked ? true : someChecked ? 'indeterminate' : false
  return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center no-drag">
        <div className="bg-card border border-border rounded-xl w-[720px] max-w-[90vw] shadow-xl">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-sm font-bold">{mode === 'match' ? t('批量一键匹配预览', 'Smart Match Preview (Batch)') : mode === 'apply' ? t('批量应用预览', 'Apply Preview (Batch)') : t('批量还原预览', 'Restore Preview (Batch)')}</div>
              <div className="flex items-center gap-2">
                <Checkbox checked={triState} onCheckedChange={(checked) => { onToggleCheckAll(!!checked) }} />
                <span className="text-xs text-gray-600 dark:text-gray-400">{t('全选', 'Select All')}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onCancel} className="text-xs">{t('取消', 'Cancel')}</Button>
              <Button onClick={onConfirm} className="text-xs">{t('确认应用', 'Confirm')}</Button>
            </div>
          </div>
          <MacScrollbar className="p-4 max-h-[60vh]" suppressScrollX>
            <div className="grid grid-cols-2 gap-3">
              {candidates.map((c, i) => (
                <div key={c.folder + i} className="border border-border rounded-lg p-3 flex items-center gap-3">
                  <Checkbox checked={c.checked} onCheckedChange={(checked) => { onToggleCheck(c.folder, !!checked) }} />
                  <div className="flex-1 min-w-0">
                    <OverflowTooltip className="text-xs text-gray-500 truncate" content={c.name}>{c.name}</OverflowTooltip>
                    <OverflowTooltip className="text-xs text-gray-400 truncate" content={c.folder}>{c.folder}</OverflowTooltip>
                  </div>
                  <div className="w-16 h-16 rounded bg-muted flex items-center justify-center overflow-hidden">
                    {mode === 'restore'
                      ? ((itemThumbs?.[c.folder] || folderThumbs[c.folder]) ? (<img src={(itemThumbs?.[c.folder] || folderThumbs[c.folder])} alt={c.name} className="w-full h-full object-contain" />) : (<span className="text-2xl">📁</span>))
                      : (thumbs[c.iconPath] ? (<img src={thumbs[c.iconPath]} alt={c.iconName} className="w-full h-full object-contain" />) : (<span className="text-2xl">📁</span>))}
                  </div>
                  <div className="flex flex-col items-end w-32">
                    {mode === 'restore' ? (
                      <div className="text-[11px] text-gray-600 dark:text-gray-400">{t('将还原', 'Will restore')}</div>
                    ) : (
                      <OverflowTooltip className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[8rem]" content={c.iconName}>{c.iconName}</OverflowTooltip>
                    )}
                    {mode === 'match' && c.exact ? (<span className="mt-1 text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{t('完全匹配', 'Exact match')}</span>) : null}
                  </div>
                </div>
              ))}
              {candidates.length === 0 ? (<div className="text-xs text-center text-gray-500 py-8 col-span-2">{t('暂无匹配结果', 'No match results')}</div>) : null}
            </div>
          </MacScrollbar>
        </div>
      </div>
  )
}