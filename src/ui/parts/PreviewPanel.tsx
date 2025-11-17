import React, { useRef } from 'react'
import { MacScrollbar } from 'mac-scrollbar'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'
import { OverflowTooltip } from '@/components/ui/tooltip'
import confetti from 'canvas-confetti'

type Item = { type: 'folder' | 'shortcut' | 'application' | 'filetype'; name: string; path: string; ext?: string }
type FolderPreview = { ok: boolean; hasDesktopIni: boolean; hasFolderIco: boolean; iconPath: string; iconDataUrl: string } | null
type ShortcutPreview = { ok: boolean; iconPath: string; iconDataUrl: string; fromTarget: boolean } | null
type ApplicationPreview = string

type Props = {
  selectedFolderItem: Item | null
  folderPreview: FolderPreview
  shortcutPreview: ShortcutPreview
  applicationPreview: ApplicationPreview
  typeEmoji: Record<'folder' | 'shortcut' | 'application' | 'filetype', string>
  iconPreview: string
  icon: string
  folder: string
  onApplyIcon: () => void
  onRestore: () => void | Promise<void>
  onSmartMatch: () => void
  recommendations: Array<{ name: string; path: string }>
  thumbs: Record<string, string>
  onClickRecommendation: (path: string) => void
  isDark: boolean
}

export default function PreviewPanel(props: Props) {
  const { selectedFolderItem, folderPreview, shortcutPreview, applicationPreview, typeEmoji, iconPreview, icon, folder, onApplyIcon, onRestore, onSmartMatch, recommendations, thumbs, onClickRecommendation, isDark } = props
  const applyBtnRef = useRef<HTMLButtonElement | null>(null)
  return (
    <MacScrollbar className="w-80 bg-card border-l border-border" suppressScrollX skin={isDark ? 'dark' : 'light'}>
      <div className="p-6">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">实时预览</h3>

        <div className="bg-card rounded-2xl p-8 mb-4 aspect-square flex items-center justify-center">
          {selectedFolderItem?.type === 'folder'
            ? folderPreview?.iconDataUrl
              ? (<img src={folderPreview.iconDataUrl} alt={selectedFolderItem?.name || ''} className="w-24 h-24 object-contain" />)
              : (
                <div className="text-center">
                  <div className="text-8xl mb-4">{typeEmoji.folder}</div>
                </div>
              )
            : selectedFolderItem?.type === 'shortcut'
            ? shortcutPreview?.iconDataUrl
              ? (<img src={shortcutPreview.iconDataUrl} alt={selectedFolderItem?.name || ''} className="w-24 h-24 object-contain" />)
              : (
                <div className="text-center">
                  <div className="text-8xl mb-4">{typeEmoji.shortcut}</div>
                </div>
              )
            : selectedFolderItem?.type === 'application'
            ? applicationPreview
              ? (<img src={applicationPreview} alt={selectedFolderItem?.name || ''} className="w-24 h-24 object-contain" />)
              : (
                <div className="text-center">
                  <div className="text-8xl mb-4">{typeEmoji.application}</div>
                </div>
              )
            : (
              <div className="text-center">
                <div className="text-8xl mb-4">{selectedFolderItem ? typeEmoji[selectedFolderItem.type] : '📁'}</div>
              </div>
            )}
        </div>

        <div className="space-y-3">
          <Card className="p-3">
            <CardHeader className="p-0 mb-1">
              <CardTitle className="text-xs font-normal text-gray-500 dark:text-gray-400">{selectedFolderItem?.type === 'filetype' ? '文件类型扩展名' : selectedFolderItem?.type === 'shortcut' ? '快捷方式路径' : selectedFolderItem?.type === 'application' ? '应用程序路径' : '文件夹路径'}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-sm text-gray-800 dark:text-white font-mono break-all">{selectedFolderItem?.type === 'filetype' ? (selectedFolderItem?.ext || '未选择') : (selectedFolderItem?.path || folder || '未选择')}</div>
            </CardContent>
          </Card>

          <Card className="p-3">
            <CardHeader className="p-0 mb-1">
              <CardTitle className="text-xs font-normal text-gray-500 dark:text-gray-400">当前图标</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {selectedFolderItem ? (
                <div className="flex items-center gap-2">
                  {iconPreview ? (
                    <img src={iconPreview} alt="icon" className="w-10 h-10 object-contain" />
                  ) : (
                    <span className="text-3xl">{typeEmoji[selectedFolderItem.type]}</span>
                  )}
                  <OverflowTooltip className="text-sm text-gray-800 dark:text-white truncate max-w-[10rem]" content={icon ? (icon.split(/\\|\//).pop() || '') : '未选择图标(.ico)'}>
                    {icon ? icon.split(/\\|\//).pop() : '未选择图标(.ico)'}
                  </OverflowTooltip>
                </div>
              ) : (
                <div className="text-xs text-gray-600 dark:text-gray-400">未选择</div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <Button ref={applyBtnRef} disabled={!icon || !selectedFolderItem || (selectedFolderItem.type === 'folder' ? !folder : false)} onClick={() => {
              try {
                const rect = applyBtnRef.current?.getBoundingClientRect()
                if (rect) {
                  const originX = (rect.left + rect.width / 2) / window.innerWidth
                  const originY = (rect.top + rect.height / 2) / window.innerHeight
                  confetti({ particleCount: 10, spread: 60, angle: 90, startVelocity: 20, origin: { x: originX, y: originY } })
                } else {
                  confetti({ particleCount: 60, spread: 60 })
                }
              } catch {}
              onApplyIcon()
            }}>
              应用图标
            </Button>
            <Button variant="outline" onClick={onRestore}>
              还原
            </Button>
          </div>

          <Button onClick={onSmartMatch} className="w-full">
            <Sparkles className="w-4 h-4" />
            一键匹配图标
          </Button>
        </div>

        <div className="mt-6">
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3">相似推荐</h4>
          <div className="grid grid-cols-4 gap-2">
            {recommendations.map((it) => (
              <Button key={it.path} variant="secondary" className="aspect-square rounded-lg p-2" onClick={() => { onClickRecommendation(it.path) }}>
                {thumbs[it.path] ? (
                  <img src={thumbs[it.path]} alt={it.name} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-2xl">📁</span>
                )}
              </Button>
            ))}
            {recommendations.length === 0 ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg border border-border bg-muted" />
              ))
            ) : null}
          </div>
        </div>
      </div>
    </MacScrollbar>
  )
}