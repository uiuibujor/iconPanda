import React, { useState, useCallback } from 'react'

declare global {
  interface Window {
    api: {
      pickFolder: () => Promise<string>
      pickIcon: () => Promise<string>
      applyIcon: (folder: string, icon: string) => Promise<boolean>
    }
  }
}

export default function App() {
  const [folder, setFolder] = useState('')
  const [icon, setIcon] = useState('')
  const pickFolder = useCallback(async () => {
    const f = await window.api.pickFolder()
    if (f) setFolder(f)
  }, [])
  const pickIcon = useCallback(async () => {
    const i = await window.api.pickIcon()
    if (i) setIcon(i)
  }, [])
  const apply = useCallback(async () => {
    const ok = await window.api.applyIcon(folder, icon)
    alert(ok ? '已应用' : '失败')
  }, [folder, icon])
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (file.type === 'image/x-icon' || file.name.toLowerCase().endsWith('.ico')) {
      setIcon(file.path)
    }
    if (file.type === '' && e.dataTransfer.items?.[0]?.kind === 'file') {
      setFolder(file.path)
    }
  }, [])
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])
  return (
    <div style={{ padding: 20, fontFamily: 'Segoe UI' }} onDrop={onDrop} onDragOver={onDragOver}>
      <h2>图标替换助手</h2>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={pickFolder}>选择文件夹</button>
        <span>{folder}</span>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
        <button onClick={pickIcon}>选择图标(.ico)</button>
        <span>{icon}</span>
      </div>
      <div style={{ marginTop: 20 }}>
        <button disabled={!folder || !icon} onClick={apply}>应用到文件夹</button>
      </div>
      <div style={{ marginTop: 20, padding: 20, border: '1px dashed #999' }}>
        拖拽文件夹或 .ico 到此
      </div>
    </div>
  )
}