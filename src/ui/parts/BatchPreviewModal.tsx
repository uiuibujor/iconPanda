import React from 'react'
import { Button } from '../../components/ui/button'
import { Checkbox } from '../../components/ui/checkbox'

type Candidate = { folder: string; name: string; iconPath: string; iconName: string; checked: boolean; exact: boolean }
type Mode = 'match' | 'apply' | 'restore'

type Props = {
  open: boolean
  mode: Mode
  candidates: Candidate[]
  folderThumbs: Record<string, string>
  thumbs: Record<string, string>
  onCancel: () => void
  onConfirm: () => void | Promise<void>
  onToggleCheck: (folder: string, checked: boolean) => void
  onToggleCheckAll: (checked: boolean) => void
}

export default function BatchPreviewModal(props: Props) {
  const { open, mode, candidates, folderThumbs, thumbs, onCancel, onConfirm, onToggleCheck, onToggleCheckAll } = props
  if (!open) return null
  const allChecked = candidates.length !== 0 && candidates.every((c) => c.checked)
  const someChecked = candidates.some((c) => c.checked)
  const triState = candidates.length === 0 ? false : allChecked ? true : someChecked ? 'indeterminate' : false
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center no-drag">
      <div className="bg-card border border-border rounded-xl w-[720px] max-w-[90vw] shadow-xl">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-sm font-bold">{mode === 'match' ? '批量一键匹配预览' : mode === 'apply' ? '批量应用预览' : '批量还原预览'}</div>
            <div className="flex items-center gap-2">
              <Checkbox checked={triState} onCheckedChange={(checked) => { onToggleCheckAll(!!checked) }} />
              <span className="text-xs text-gray-600 dark:text-gray-400">全选</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onCancel} className="text-xs">取消</Button>
            <Button onClick={onConfirm} className="text-xs">确认应用</Button>
          </div>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            {candidates.map((c, i) => (
              <div key={c.folder + i} className="border border-border rounded-lg p-3 flex items-center gap-3">
                <Checkbox checked={c.checked} onCheckedChange={(checked) => { onToggleCheck(c.folder, !!checked) }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 truncate">{c.name}</div>
                  <div className="text-[10px] text-gray-400 truncate">{c.folder}</div>
                </div>
                <div className="w-16 h-16 rounded bg-muted flex items-center justify-center overflow-hidden">
                  {mode === 'restore'
                    ? (folderThumbs[c.folder] ? (<img src={folderThumbs[c.folder]} alt={c.name} className="w-full h-full object-contain" />) : (<span className="text-2xl">📁</span>))
                    : (thumbs[c.iconPath] ? (<img src={thumbs[c.iconPath]} alt={c.iconName} className="w-full h-full object-contain" />) : (<span className="text-2xl">📁</span>))}
                </div>
                <div className="flex flex-col items-end w-28">
                  <div className="text-[11px] text-gray-600 dark:text-gray-400 truncate">{mode === 'restore' ? '将还原' : c.iconName}</div>
                  {mode === 'match' && c.exact ? (<span className="mt-1 text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">完全匹配</span>) : null}
                </div>
              </div>
            ))}
            {candidates.length === 0 ? (<div className="text-xs text-center text-gray-500 py-8 col-span-2">暂无匹配结果</div>) : null}
          </div>
        </div>
      </div>
    </div>
  )
}