import React from 'react'
import clsx from 'clsx'
import { Button } from '@/components/ui/button'
import { Check, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react'

type Item = { name: string; path: string }

type Props = {
  libraryLoading: boolean
  pageItems: Item[]
  thumbs: Record<string, string>
  icon: string
  isApplied: (iconPath: string) => boolean
  onSelectIcon: (iconPath: string) => void
  onApplyOrRestore: (iconPath: string) => void | Promise<void>
  empty: boolean
  libraryPage: number
  pageCount: number
  filteredCount: number
  onFirstPage: () => void
  onPrevPage: () => void
  onNextPage: () => void
  onLastPage: () => void
  locale?: 'zh' | 'en'
}

export default function IconLibraryGrid(props: Props) {
  const { libraryLoading, pageItems, thumbs, icon, isApplied, onSelectIcon, onApplyOrRestore, empty, libraryPage, pageCount, filteredCount, onFirstPage, onPrevPage, onNextPage, onLastPage, locale = 'zh' } = props
  const t = (zh: string, en: string) => (locale === 'zh' ? zh : en)
  return (
    <>
      <div className={'flex flex-wrap gap-4 min-h-[160px]'}>
        {libraryLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl p-4 border border-border w-[120px]">
              <div className="w-full aspect-square flex items-center justify-center mb-2">
                <div className="w-12 h-12 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-3 w-20 mx-auto rounded bg-muted animate-pulse" />
            </div>
          ))
        ) : (
          (pageItems.length ? pageItems : []).map((it) => (
            <div
              key={it.path}
              onClick={() => { onSelectIcon(it.path) }}
              className={clsx(
                'group relative bg-card rounded-xl p-4 hover:shadow-sm transition-all cursor-pointer border border-border w-[120px]',
                icon === it.path && 'ring-2 ring-ring'
              )}
            >
              <div className="w-full aspect-square flex items-center justify-center text-4xl mb-2">
                {thumbs[it.path] ? (<img src={thumbs[it.path]} alt={it.name} className="w-12 h-12 object-contain" />) : (<span>📁</span>)}
              </div>
              <div className="text-xs text-center text-gray-600 dark:text-gray-400 truncate">{it.name}</div>
              <Button
                onClick={async (e) => { e.stopPropagation(); await onApplyOrRestore(it.path) }}
                title={t('应用此图标', 'Apply this icon')}
                className={clsx(
                  'absolute top-2 right-2 opacity-0 group-hover:opacity-100 rounded-full transition-opacity transition-colors duration-200 ease-out flex items-center justify-center',
                  isApplied(it.path)
                    ? 'bg-muted text-foreground min-w-[50px] h-6 hover:ring-1 hover:ring-border'
                    : 'bg-transparent border border-border text-foreground min-w-[50px] h-6 text-[9px] hover:ring-1 hover:ring-border'
                )}
              >
                {isApplied(it.path) ? (
                  <Check className="w-3 h-3 apply-btn-check" />
                ) : (
                  <span className="apply-btn-text">{t('应用', 'Apply')}</span>
                )}
              </Button>
            </div>
          ))
        )}
        {empty ? (
          <div className="col-span-8 text-center text-sm text-gray-500 dark:text-gray-400 py-8">{t('图标库为空，点击“导入图标(.ico)”进行导入', 'Library is empty, click "Import icons (.ico)" to add')}</div>
        ) : null}
      </div>
      <div className="mt-4 flex items-center justify-center gap-3">
        <span className="text-xs text-gray-600 dark:text-gray-400">{locale === 'zh' ? `第 ${Math.min(libraryPage, pageCount)} / ${pageCount} 页 · 共 ${filteredCount} 项` : `Page ${Math.min(libraryPage, pageCount)} / ${pageCount} · Total ${filteredCount} items`}</span>
        <Button variant="outline" className="w-9 h-9 p-0 rounded-xl" onClick={onFirstPage} disabled={libraryPage <= 1}>
          <ChevronsLeft className="w-4 h-4" />
        </Button>
        <Button variant="outline" className="w-9 h-9 p-0 rounded-xl" onClick={onPrevPage} disabled={libraryPage <= 1}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button variant="outline" className="w-9 h-9 p-0 rounded-xl" onClick={onNextPage} disabled={libraryPage >= pageCount}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" className="w-9 h-9 p-0 rounded-xl" onClick={onLastPage} disabled={libraryPage >= pageCount}>
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>
    </>
  )
}