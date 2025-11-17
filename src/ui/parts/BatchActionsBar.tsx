import React from 'react'
import { Button } from '../../components/ui/button'

type Props = {
  selectedCount: number
  totalCount: number
  onBatchApply: () => void | Promise<void>
  onBatchMatch: () => void | Promise<void>
  onBatchRestore: () => void | Promise<void>
  onBatchDelete: () => void
  locale?: 'zh' | 'en'
}

export default function BatchActionsBar(props: Props) {
  const { selectedCount, totalCount, onBatchApply, onBatchMatch, onBatchRestore, onBatchDelete, locale = 'zh' } = props
  const t = (zh: string, en: string) => (locale === 'zh' ? zh : en)
  return (
    <div className="bg-card border-t border-border px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>{locale === 'zh' ? `已选择: ${selectedCount} 个项目` : `Selected: ${selectedCount} items`}</span>
          <span>|</span>
          <span>{locale === 'zh' ? `共管理: ${totalCount} 个项目` : `Managing: ${totalCount} items`}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onBatchApply} variant="outline" className="text-sm">{t('批量应用', 'Apply (Batch)')}</Button>
          <Button onClick={onBatchMatch} variant="outline" className="text-sm">{t('批量一键匹配', 'Smart Match (Batch)')}</Button>
          <Button onClick={onBatchRestore} variant="outline" className="text-sm">{t('批量还原', 'Restore (Batch)')}</Button>
          <Button onClick={onBatchDelete} variant="destructive" className="text-sm">{t('批量删除', 'Delete (Batch)')}</Button>
        </div>
      </div>
    </div>
  )
}