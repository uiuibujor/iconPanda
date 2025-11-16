import React from 'react'
import { Button } from '../../components/ui/button'

type Props = {
  selectedCount: number
  totalCount: number
  onBatchApply: () => void | Promise<void>
  onBatchMatch: () => void | Promise<void>
  onBatchRestore: () => void | Promise<void>
  onBatchDelete: () => void
}

export default function BatchActionsBar(props: Props) {
  const { selectedCount, totalCount, onBatchApply, onBatchMatch, onBatchRestore, onBatchDelete } = props
  return (
    <div className="bg-card border-t border-border px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>已选择: <strong className="text-foreground">{selectedCount}</strong> 个项目</span>
          <span>|</span>
          <span>共管理: <strong>{totalCount}</strong> 个项目</span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onBatchApply} variant="outline" className="text-sm">批量应用</Button>
          <Button onClick={onBatchMatch} variant="outline" className="text-sm">批量一键匹配</Button>
          <Button onClick={onBatchRestore} variant="outline" className="text-sm">批量还原</Button>
          <Button onClick={onBatchDelete} variant="destructive" className="text-sm">批量删除</Button>
        </div>
      </div>
    </div>
  )
}