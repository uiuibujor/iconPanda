// main.js
import { app, BrowserWindow, ipcMain, dialog, shell, Menu, clipboard } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import Store from 'electron-store'
import pngToIco from 'png-to-ico'

const store = new Store({ name: 'settings' })

function ensureDir(dir) {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  } catch {}
}

function getIconLibraryPath() {
  let dir = store.get('iconLibraryPath')
  if (typeof dir !== 'string' || !dir) {
    const defaultDir = 'd:\\codes\\图标替换助手\\iconlibrary'
    dir = defaultDir
    store.set('iconLibraryPath', dir)
  }
  ensureDir(dir)
  return dir
}

function uniqueTarget(dir, baseName) {
  const ext = path.extname(baseName)
  const name = path.basename(baseName, ext)
  let candidate = path.join(dir, baseName)
  let i = 1
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${name} (${i})${ext}`)
    i += 1
  }
  return candidate
}

function listIconsInLibrary() {
  const dir = getIconLibraryPath()
  try {
    const files = fs.readdirSync(dir)
    return files
      .filter((f) => f.toLowerCase().endsWith('.ico'))
      .map((f) => ({ name: f, path: path.join(dir, f) }))
  } catch {
    return []
  }
}

function importIconToLibrary(srcPath) {
  if (!srcPath || !fs.existsSync(srcPath)) return { ok: false, dest: '' }
  const dir = getIconLibraryPath()
  const base = path.basename(srcPath)
  const target = uniqueTarget(dir, base)
  try {
    fs.copyFileSync(srcPath, target)
    return { ok: true, dest: target }
  } catch {
    return { ok: false, dest: '' }
  }
}
// 窗口创建相关
function createWindow() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const win = new BrowserWindow({
    width: 1288,
    height: 800,
    minWidth: 1288,
    minHeight: 600,
    frame: false,
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, '../build/icons/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  Menu.setApplicationMenu(null)
  try { win.setMenuBarVisibility(false) } catch {}
  const devUrl = 'http://127.0.0.1:3000'
  win.loadURL(devUrl)
  win.once('ready-to-show', () => {
    try { win.show() } catch {}
  })
  win.webContents.openDevTools({ mode: 'detach' })
}

function ensureDesktopIni(folder, iconPath) {
  try {
    const iniPath = path.join(folder, 'desktop.ini')
    try { if (fs.existsSync(iniPath)) fs.unlinkSync(iniPath) } catch {}
    const content = `[.ShellClassInfo]\r\nIconFile=${iconPath}\r\nIconIndex=0\r\n`
    fs.writeFileSync(iniPath, content, { encoding: 'utf8' })
    try { execFileSync('attrib', ['+h', '+s', iniPath]) } catch {}
    return true
  } catch {
    return false
  }
}

function setFolderAttributes(folder) {
  try { execFileSync('attrib', ['+s', '+r', folder]) } catch {}
}

function copyIconToFolder(folder, sourceIcon) {
  const target = path.join(folder, '.folder.ico')
  try { if (fs.existsSync(target)) fs.unlinkSync(target) } catch {}
  fs.copyFileSync(sourceIcon, target)
  try { execFileSync('attrib', ['+h', target]) } catch {}
  return target
}

function restoreFolderIcon(folder) {
  try {
    if (!folder) return false
    const iniPath = path.join(folder, 'desktop.ini')
    const icoPath = path.join(folder, '.folder.ico')
    try { if (fs.existsSync(iniPath)) fs.unlinkSync(iniPath) } catch {}
    try { if (fs.existsSync(icoPath)) fs.unlinkSync(icoPath) } catch {}
    try { execFileSync('attrib', ['-s', '-r', folder]) } catch {}
    refreshIconCache()
    return true
  } catch {
    return false
  }
}

function runShortcutScript(scriptContent, args) {
  let tmpDir = null
  let scriptPath = null
  try {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-helper-'))
    scriptPath = path.join(tmpDir, 'shortcut.js')
    fs.writeFileSync(scriptPath, scriptContent, { encoding: 'utf8' })
    execFileSync('cscript', ['//nologo', scriptPath, ...args], { windowsHide: true })
    return true
  } catch {
    return false
  } finally {
    try { if (scriptPath) fs.unlinkSync(scriptPath) } catch {}
    try { if (tmpDir) fs.rmdirSync(tmpDir) } catch {}
  }
}
// lnk文件图标预览
// 已迁移到 electron/iconExtractor.js
// 已迁移到 electron/iconExtractor.js

// 已迁移到 electron/iconExtractor.js

// 已迁移到 electron/iconExtractor.js

function applyShortcutIcon(lnkPath, iconPath) {
  if (!lnkPath || !iconPath) return false
  if (!fs.existsSync(lnkPath) || !fs.existsSync(iconPath)) return false
  const content = "var sh=WScript.CreateObject('WScript.Shell');var p=WScript.Arguments.Item(0);var i=WScript.Arguments.Item(1);var s=sh.CreateShortcut(p);s.IconLocation=i+',0';s.Save();"
  const ok = runShortcutScript(content, [lnkPath, iconPath])
  if (ok) refreshIconCache()
  return ok
}

function restoreShortcutIcon(lnkPath) {
  if (!lnkPath || !fs.existsSync(lnkPath)) return false
  const content = "var sh=WScript.CreateObject('WScript.Shell');var p=WScript.Arguments.Item(0);var s=sh.CreateShortcut(p);var t=s.TargetPath; if (t) { s.IconLocation=t+',0'; } else { s.IconLocation=''; } s.Save();"
  const ok = runShortcutScript(content, [lnkPath])
  if (ok) refreshIconCache()
  return ok
}

function createApplicationShortcutWithIcon(exePath, iconPath) {
  try {
    if (!exePath || !iconPath) return { ok: false, shortcut: '' }
    if (!fs.existsSync(exePath) || !fs.existsSync(iconPath)) return { ok: false, shortcut: '' }
    const desktop = path.join(os.homedir(), 'Desktop')
    ensureDir(desktop)
    const base = path.basename(exePath).replace(/\.[^.]+$/, '')
    const suggested = `${base}.lnk`
    const shortcutPath = uniqueTarget(desktop, suggested)
    const content = "var sh=WScript.CreateObject('WScript.Shell');var sp=WScript.Arguments.Item(0);var tp=WScript.Arguments.Item(1);var ip=WScript.Arguments.Item(2);var s=sh.CreateShortcut(sp);s.TargetPath=tp;s.IconLocation=ip+',0';try{s.WorkingDirectory=tp.replace(/\\\\[^\\\\]+$/,'');}catch(e){}s.Save();"
    const ok = runShortcutScript(content, [shortcutPath, exePath, iconPath])
    if (ok) refreshIconCache()
    return { ok, shortcut: ok ? shortcutPath : '' }
  } catch {
    return { ok: false, shortcut: '' }
  }
}

function deleteShortcutFile(lnkPath) {
  try {
    if (!lnkPath) return false
    if (fs.existsSync(lnkPath)) {
      fs.unlinkSync(lnkPath)
      refreshIconCache()
      return true
    }
    return false
  } catch {
    return false
  }
}

function refreshIconCache() {
  const sysRoot = process.env.SystemRoot || 'C:\\\\Windows'
  const ie4u = path.join(sysRoot, 'System32', 'ie4uinit.exe')
  if (fs.existsSync(ie4u)) {
    try { execFileSync(ie4u, ['-ClearIconCache']) } catch {}
  }
}

app.whenReady().then(() => {
  createWindow()

  ipcMain.handle('window-minimize', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return false
    win.minimize()
    return true
  })

  ipcMain.handle('window-is-maximized', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return false
    return win.isMaximized()
  })

  ipcMain.handle('window-toggle-maximize', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return false
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
    return true
  })

  ipcMain.handle('window-close', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return false
    win.close()
    return true
  })

  ipcMain.handle('pick-folder', async () => {
    const res = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (res.canceled || res.filePaths.length === 0) return ''
    return res.filePaths[0]
  })

  ipcMain.handle('pick-folders', async () => {
    const res = await dialog.showOpenDialog({ properties: ['openDirectory', 'multiSelections'] })
    if (res.canceled || res.filePaths.length === 0) return []
    return res.filePaths
  })

  ipcMain.handle('pick-icon', async () => {
    const res = await dialog.showOpenDialog({ filters: [{ name: 'Icons', extensions: ['ico'] }], properties: ['openFile'] })
    if (res.canceled || res.filePaths.length === 0) return ''
    return res.filePaths[0]
  })

  ipcMain.handle('pick-icons', async () => {
    const res = await dialog.showOpenDialog({ filters: [{ name: 'Icons', extensions: ['ico'] }], properties: ['openFile', 'multiSelections'] })
    if (res.canceled || res.filePaths.length === 0) return []
    return res.filePaths
  })

  ipcMain.handle('get-app-version', async () => {
    try { return app.getVersion() } catch { return '' }
  })

  ipcMain.handle('copy-to-clipboard', async (_e, text) => {
    try { clipboard.writeText(String(text || '')); return true } catch { return false }
  })

  ipcMain.handle('pick-pngs', async () => {
    const res = await dialog.showOpenDialog({ filters: [{ name: 'PNG Images', extensions: ['png'] }], properties: ['openFile', 'multiSelections'] })
    if (res.canceled || res.filePaths.length === 0) return []
    return res.filePaths
  })

  ipcMain.handle('pick-shortcut', async () => {
    const res = await dialog.showOpenDialog({ filters: [{ name: 'Shortcuts', extensions: ['lnk'] }], properties: ['openFile'] })
    if (res.canceled || res.filePaths.length === 0) return ''
    return res.filePaths[0]
  })

  ipcMain.handle('pick-shortcuts', async () => {
    const res = await dialog.showOpenDialog({ filters: [{ name: 'Shortcuts', extensions: ['lnk'] }], properties: ['openFile', 'multiSelections'] })
    if (res.canceled || res.filePaths.length === 0) return []
    return res.filePaths
  })

  ipcMain.handle('pick-application', async () => {
    const res = await dialog.showOpenDialog({ filters: [{ name: 'Executables', extensions: ['exe', 'dll'] }], properties: ['openFile'] })
    if (res.canceled || res.filePaths.length === 0) return ''
    return res.filePaths[0]
  })

  ipcMain.handle('pick-applications', async () => {
    const res = await dialog.showOpenDialog({ filters: [{ name: 'Executables', extensions: ['exe', 'dll'] }], properties: ['openFile', 'multiSelections'] })
    if (res.canceled || res.filePaths.length === 0) return []
    return res.filePaths
  })

  ipcMain.handle('apply-icon', async (_e, folder, icon) => {
    if (!folder || !icon) return false
    const copied = copyIconToFolder(folder, icon)
    const rel = path.basename(copied)
    const okIni = ensureDesktopIni(folder, rel)
    if (!okIni) return false
    setFolderAttributes(folder)
    refreshIconCache()
    return true
  })

  ipcMain.handle('restore-icon', async (_e, folder) => {
    return restoreFolderIcon(folder)
  })

  ipcMain.handle('apply-shortcut-icon', async (_e, lnk, icon) => {
    return applyShortcutIcon(lnk, icon)
  })

  ipcMain.handle('restore-shortcut-icon', async (_e, lnk) => {
    return restoreShortcutIcon(lnk)
  })

  ipcMain.handle('apply-application-icon', async (_e, exe, icon) => {
    const res = createApplicationShortcutWithIcon(exe, icon)
    return res
  })

  ipcMain.handle('restore-application-shortcut', async (_e, lnk) => {
    return deleteShortcutFile(lnk)
  })

  ipcMain.handle('get-icon-preview', async (_e, iconPath) => {
    try {
      if (!iconPath) return { ok: false, dataUrl: '', size: 0 }
      if (!fs.existsSync(iconPath)) return { ok: false, dataUrl: '', size: 0 }
      const ext = path.extname(iconPath).toLowerCase()
      const buf = fs.readFileSync(iconPath)
      const b64 = buf.toString('base64')
      const mime = ext === '.png' ? 'image/png' : 'image/x-icon'
      const dataUrl = `data:${mime};base64,${b64}`
      return { ok: true, dataUrl, size: buf.length }
    } catch {
      return { ok: false, dataUrl: '', size: 0 }
    }
  })

  ipcMain.handle('get-folder-preview', async (_e, folderPath) => {
    try {
      if (!folderPath) return { ok: false }
      const exists = fs.existsSync(folderPath)
      if (!exists) return { ok: false }
      const desktopIni = path.join(folderPath, 'desktop.ini')
      const hasDesktopIni = fs.existsSync(desktopIni)
      const folderIco = path.join(folderPath, '.folder.ico')
      const hasFolderIco = fs.existsSync(folderIco)
      let iconFile = ''
      if (hasFolderIco) {
        iconFile = folderIco
      } else if (hasDesktopIni) {
        try {
          const ini = fs.readFileSync(desktopIni, { encoding: 'utf8' })
          const match = ini.match(/IconFile\s*=\s*(.*)/i)
          if (match && match[1]) {
            const raw = match[1].trim()
            iconFile = path.isAbsolute(raw) ? raw : path.join(folderPath, raw)
          }
          if (!iconFile) {
            const rmatch = ini.match(/IconResource\s*=\s*(.*)/i)
            if (rmatch && rmatch[1]) {
              const rawr = rmatch[1].trim()
              const first = rawr.split(',')[0].trim()
              const cleaned = first.replace(/^"(.*)"$/, '$1')
              iconFile = path.isAbsolute(cleaned) ? cleaned : path.join(folderPath, cleaned)
            }
          }
        } catch {}
      }
      let dataUrl = ''
      if (iconFile && fs.existsSync(iconFile)) {
        try {
          const buf = fs.readFileSync(iconFile)
          dataUrl = `data:image/x-icon;base64,${buf.toString('base64')}`
        } catch {}
      }
      return {
        ok: true,
        hasDesktopIni,
        hasFolderIco,
        iconPath: iconFile,
        iconDataUrl: dataUrl
      }
    } catch {
      return { ok: false }
    }
  })

  // 从.lnk快捷方式提取图标预览
  ipcMain.handle('get-shortcut-preview', async (_e, lnkPath) => {
    try {
      console.log('[IPC] 开始提取快捷方式预览:', lnkPath)
      const { readShortcutInfo: readShortcutInfoExt, extractFileIconDataUrl: extractFileIconDataUrlExt } = await import('./iconExtractor.js')
      if (!lnkPath) {
        console.warn('[IPC] 路径为空')
        return { ok: false, iconPath: '', iconDataUrl: '', fromTarget: false }
      }
      if (!fs.existsSync(lnkPath)) {
        console.warn('[IPC] 文件不存在:', lnkPath)
        return { ok: false, iconPath: '', iconDataUrl: '', fromTarget: false }
      }
      
      // 读取快捷方式信息，获取图标路径和索引
      let { iconPath, iconIndex, fromTarget } = await readShortcutInfoExt(lnkPath)
      console.log('[IPC] 读取图标信息成功:', { iconPath, iconIndex, fromTarget })
      
      if ((!iconPath || iconPath.trim() === '') && fromTarget) {
        console.log('[IPC] iconPath 为空但 fromTarget=true，这是正常的回退行为')
      } else if (!iconPath || iconPath.trim() === '') {
        console.warn('[IPC] 无法获取有效的图标路径')
        return { ok: false, iconPath: '', iconDataUrl: '', fromTarget }
      }
      iconPath = iconPath.replace(/%([^%]+)%/g, (_m, n) => (process.env[n] ? String(process.env[n]) : `%${n}%`))
      console.log('[IPC] 展开环境变量后图标路径:', iconPath)
      
      let dataUrl = ''
      const ext = path.extname(iconPath).toLowerCase()
      
      if (!iconPath || !fs.existsSync(iconPath)) {
        console.warn('[IPC] 图标路径不存在:', iconPath)
        return { ok: false, iconPath, iconDataUrl: '', fromTarget }
      }
      if (ext !== '.ico' && ext !== '.exe' && ext !== '.dll') {
        console.warn('[IPC] 不支持的图标格式:', ext)
        return { ok: false, iconPath, iconDataUrl: '', fromTarget }
      }
      if (iconPath && fs.existsSync(iconPath) && (ext === '.ico' || ext === '.exe' || ext === '.dll')) {
        console.log('[IPC] 图标文件存在，准备提取:', { iconPath, iconIndex, ext })
        dataUrl = await extractFileIconDataUrlExt(iconPath, iconIndex)
        if (dataUrl) {
          console.log('[IPC] 第一次提取成功')
          console.log('[IPC] DataURL 前缀:', dataUrl.substring(0, 60))
          console.log('[IPC] DataURL 总长度:', dataUrl.length)
          console.log('[IPC] 是否以 data:image 开头:', dataUrl.startsWith('data:image/'))
          try {
            const base64Part = dataUrl.split(',')[1]
            if (base64Part) {
              console.log('[IPC] Base64 部分长度:', base64Part.length)
              console.log('[IPC] Base64 前100字符:', base64Part.substring(0, 100))
              const buffer = Buffer.from(base64Part, 'base64')
              console.log('[IPC] Buffer 大小:', buffer.length, 'bytes')
              const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47
              console.log('[IPC] 是否为有效 PNG:', isPNG)
            }
          } catch (err) {
            console.error('[IPC] Base64 验证失败:', err.message)
          }
        } else {
          console.warn('[IPC] 第一次提取失败，尝试索引 0')
        }
        if (!dataUrl) {
          dataUrl = await extractFileIconDataUrlExt(iconPath, 0)
          if (dataUrl) {
            console.log('[IPC] 使用索引 0 提取成功')
          } else {
            console.error('[IPC] 所有提取尝试均失败')
          }
        }
      } else {
        console.warn('[IPC] 图标路径或扩展名不受支持或不存在:', { iconPath, ext })
      }
      
      console.log('[IPC] 提取结果长度:', dataUrl ? dataUrl.length : 0)
      const result = { ok: true, iconPath, iconDataUrl: dataUrl, fromTarget }
      console.log('[IPC] 返回结果摘要:', { ok: result.ok, iconPathLength: result.iconPath.length, dataUrlLength: result.iconDataUrl.length, hasDataUrl: !!result.iconDataUrl })
      return result
    } catch (err) {
      console.error('[IPC] 异常:', err)
      return { ok: false, iconPath: '', iconDataUrl: '', fromTarget: false }
    }
  })

  ipcMain.handle('get-file-icon-preview', async (_e, filePath) => {
    try {
      console.log('[IPC] get-file-icon-preview start', { filePath })
      const { extractFileIconDataUrl: extractFileIconDataUrlExt } = await import('./iconExtractor.js')
      if (!filePath) return { ok: false, dataUrl: '' }
      if (!fs.existsSync(filePath)) return { ok: false, dataUrl: '' }
      const ext = path.extname(filePath).toLowerCase()
      if (ext === '.ico' || ext === '.exe' || ext === '.dll') {
        const png = await extractFileIconDataUrlExt(filePath, 0)
        console.log('[IPC] get-file-icon-preview result', { ok: !!png, length: png ? png.length : 0 })
        return { ok: !!png, dataUrl: png || '' }
      }
      console.warn('[IPC] get-file-icon-preview unsupported extension', { ext })
      return { ok: false, dataUrl: '' }
    } catch {
      console.error('[IPC] get-file-icon-preview error')
      return { ok: false, dataUrl: '' }
    }
  })

  ipcMain.handle('get-file-icon-previews', async (_e, filePath, index = 0) => {
    try {
      console.log('[IPC] get-file-icon-previews start', { filePath, index })
      const { extractFileIconDataUrls: extractFileIconDataUrlsExt } = await import('./iconExtractor.js')
      if (!filePath) return { ok: false, items: [] }
      if (!fs.existsSync(filePath)) return { ok: false, items: [] }
      const ext = path.extname(filePath).toLowerCase()
      if (ext === '.exe' || ext === '.dll') {
        const items = await extractFileIconDataUrlsExt(filePath, typeof index === 'number' ? index : 0)
        console.log('[IPC] get-file-icon-previews items', { count: items.length, sizes: items.map((i) => i.size) })
        return { ok: items.length > 0, items }
      }
      if (ext === '.ico') {
        const buf = fs.readFileSync(filePath)
        const dataUrl = `data:image/x-icon;base64,${buf.toString('base64')}`
        console.log('[IPC] get-file-icon-previews ico', { length: dataUrl.length })
        return { ok: true, items: [{ size: 'large', dataUrl }] }
      }
      console.warn('[IPC] get-file-icon-previews unsupported extension', { ext })
      return { ok: false, items: [] }
    } catch {
      console.error('[IPC] get-file-icon-previews error')
      return { ok: false, items: [] }
    }
  })

  function extractFileIconToIcoLegacy(filePath, iconIndex, destPath, size) {
    try {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-helper-'))
      const scriptPath = path.join(tmpDir, 'save-ico.ps1')
      const ps = `Add-Type -AssemblyName System.Drawing\nAdd-Type -TypeDefinition @"\nusing System;\nusing System.Runtime.InteropServices;\nusing System.Drawing;\npublic class IconExtractor {\n  [DllImport(\"Shell32.dll\", CharSet=CharSet.Auto)]\n  public static extern uint ExtractIconEx(string lpszFile, int nIconIndex, IntPtr[] phiconLarge, IntPtr[] phiconSmall, uint nIcons);\n  [DllImport(\"User32.dll\", CharSet=CharSet.Auto)]\n  public static extern uint PrivateExtractIcons(string lpszFile, int nIconIndex, int cxIcon, int cyIcon, IntPtr[] phicon, uint[] piconid, uint nIcons, uint flags);\n  [DllImport(\"User32.dll\", CharSet=CharSet.Auto)]\n  public static extern bool DestroyIcon(IntPtr hIcon);\n  public static IntPtr ExtractSizeHandle(string file, int index, int w, int h) {\n    IntPtr[] arr = new IntPtr[1];\n    uint[] ids = new uint[1];\n    uint got = PrivateExtractIcons(file, index, w, h, arr, ids, 1, 0);\n    if (got == 0) return IntPtr.Zero;\n    return arr[0];\n  }\n  public static IntPtr ExtractIndexHandle(string file, int index, bool large) {\n    IntPtr[] largeIcons = new IntPtr[1];\n    IntPtr[] smallIcons = new IntPtr[1];\n    ExtractIconEx(file, index, large ? largeIcons : null, large ? null : smallIcons, 1);\n    return large ? largeIcons[0] : smallIcons[0];\n  }\n}\n"@ -ReferencedAssemblies System.Drawing\n$path = $args[0]\n$index = [int]$args[1]\n$dest = $args[2]\n$sizeArg = $args[3]\n$w = 48\n$h = 48\nif ($sizeArg -and $sizeArg -eq 'small') { $w = 16; $h = 16 }\nelseif ($sizeArg -and $sizeArg -eq 'large') { $w = 48; $h = 48 }\nelse { try { $w = [int]$sizeArg; $h = $w } catch { } }\n$hIcon = [IconExtractor]::ExtractSizeHandle($path, $index, $w, $h)\nif ($hIcon -eq [IntPtr]::Zero -and $index -lt 0) { $hIcon = [IconExtractor]::ExtractSizeHandle($path, -$index, $w, $h) }\nif ($hIcon -eq [IntPtr]::Zero) { $hIcon = [IconExtractor]::ExtractIndexHandle($path, $index, $true) }\nif ($hIcon -eq [IntPtr]::Zero -and $index -lt 0) { $hIcon = [IconExtractor]::ExtractIndexHandle($path, -$index, $true) }\n$icon = $null\nif ($hIcon -eq [IntPtr]::Zero) { try { $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($path) } catch { } }\nif ($hIcon -ne [IntPtr]::Zero) {\n  $bmp = [System.Drawing.Bitmap]::FromHicon($hIcon)\n  $ms = New-Object System.IO.MemoryStream\n  $bmp.Save($ms,[System.Drawing.Imaging.ImageFormat]::Png)\n  $png = $ms.ToArray()\n  $fs = [System.IO.File]::Create($dest)\n  $bw = New-Object System.IO.BinaryWriter($fs)\n  $bw.Write([UInt16]0)\n  $bw.Write([UInt16]1)\n  $bw.Write([UInt16]1)\n  $wb = 0\n  $hb = 0\n  if ($w -lt 256) { $wb = [Math]::Min($w, 255) }\n  if ($h -lt 256) { $hb = [Math]::Min($h, 255) }\n  $bw.Write([Byte]$wb)\n  $bw.Write([Byte]$hb)\n  $bw.Write([Byte]0)\n  $bw.Write([Byte]0)\n  $bw.Write([UInt16]0)\n  $bw.Write([UInt16]0)\n  $bw.Write([UInt32]$png.Length)\n  $bw.Write([UInt32]22)\n  $bw.Write($png,0,$png.Length)\n  $bw.Close()\n  $fs.Close()\n  [IconExtractor]::DestroyIcon($hIcon) | Out-Null\n} elseif ($icon -ne $null) {\n  $fs = [System.IO.File]::Create($dest)\n  $icon.Save($fs)\n  $fs.Close()\n}`
      fs.writeFileSync(scriptPath, ps, { encoding: 'utf8' })
      execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, filePath, String(iconIndex), destPath, String(size || 'large')], { windowsHide: true })
      return fs.existsSync(destPath)
    } catch {
      return false
    }
  }

  ipcMain.handle('extract-icon-to-library', async (_e, srcPath, index, size) => {
    try {
      const { extractFileIconDataUrls: extractFileIconDataUrlsExt, extractFileIconDataUrl: extractFileIconDataUrlExt } = await import('./iconExtractor.js')
      if (!srcPath || !fs.existsSync(srcPath)) return { ok: false, dest: '' }
      const dir = getIconLibraryPath()
      const base = path.basename(srcPath)
      const nameNoExt = base.replace(/\.[^.]+$/, '')
      const suggested = `${nameNoExt}.ico`
      const targetPath = uniqueTarget(dir, suggested)
      const sizeArg = (typeof size === 'string') ? size : ((typeof size === 'number') ? String(size) : 'large')
      try {
        const sizeNum = (sizeArg === 'small') ? 16 : (sizeArg === 'large') ? 48 : parseInt(sizeArg, 10)
        const items = await extractFileIconDataUrlsExt(srcPath, typeof index === 'number' ? index : 0)
        let dataUrl = ''
        const found = items.find((it) => Number(it.size) === Number(sizeNum)) || items.sort((a,b)=>Number(b.size)-Number(a.size))[0]
        if (found && found.dataUrl) {
          dataUrl = found.dataUrl
        } else {
          const one = await extractFileIconDataUrlExt(srcPath, typeof index === 'number' ? index : 0)
          dataUrl = one || ''
        }
        if (!dataUrl) return { ok: false, dest: '' }
        const b64 = String(dataUrl).split(',')[1] || ''
        if (!b64) return { ok: false, dest: '' }
        const buf = Buffer.from(b64, 'base64')
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-helper-'))
        const pngPath = path.join(tmp, 'tmp.png')
        fs.writeFileSync(pngPath, buf)
        try {
          const icoBuf = await pngToIco(pngPath)
          fs.writeFileSync(targetPath, icoBuf)
        } finally {
          try { if (fs.existsSync(pngPath)) fs.unlinkSync(pngPath) } catch {}
          try { if (fs.existsSync(tmp)) fs.rmdirSync(tmp) } catch {}
        }
        const ok = fs.existsSync(targetPath)
        return { ok, dest: ok ? targetPath : '' }
      } catch {
        return { ok: false, dest: '' }
      }
    } catch {
      return { ok: false, dest: '' }
    }
  })

  ipcMain.handle('get-icon-library-path', async () => {
    try {
      const dir = getIconLibraryPath()
      return { ok: true, path: dir }
    } catch {
      return { ok: false, path: '' }
    }
  })

  ipcMain.handle('choose-icon-library-folder', async () => {
    try {
      const res = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
      if (res.canceled || res.filePaths.length === 0) return { ok: false, path: '' }
      const dir = res.filePaths[0]
      store.set('iconLibraryPath', dir)
      ensureDir(dir)
      return { ok: true, path: dir }
    } catch {
      return { ok: false, path: '' }
    }
  })

  ipcMain.handle('list-icons', async () => {
    try {
      const list = listIconsInLibrary()
      return { ok: true, items: list }
    } catch {
      return { ok: false, items: [] }
    }
  })

  ipcMain.handle('import-icon', async (_e, srcPath) => {
    const res = importIconToLibrary(srcPath)
    return res
  })

  ipcMain.handle('delete-library-icon', async (_e, iconPath) => {
    try {
      const dir = getIconLibraryPath()
      if (!iconPath || typeof iconPath !== 'string') return false
      const abs = path.resolve(iconPath)
      const inLib = abs.toLowerCase().startsWith(path.resolve(dir).toLowerCase())
      if (!inLib || !abs.toLowerCase().endsWith('.ico')) return false
      if (fs.existsSync(abs)) {
        fs.unlinkSync(abs)
        return true
      }
      return false
    } catch {
      return false
    }
  })

  ipcMain.handle('open-icon-library-folder', async () => {
    try {
      const dir = getIconLibraryPath()
      const err = await shell.openPath(dir)
      return { ok: !err }
    } catch {
      return { ok: false }
    }
  })

  ipcMain.handle('convert-png-to-ico', async (_e, pngPaths) => {
    try {
      if (!Array.isArray(pngPaths) || pngPaths.length === 0) return []
      const dir = getIconLibraryPath()
      const results = []
      for (const p of pngPaths) {
        try {
          const buf = await pngToIco(p)
          const base = path.basename(p).replace(/\.[^.]+$/, '')
          const targetPath = uniqueTarget(dir, `${base}.ico`)
          fs.writeFileSync(targetPath, buf)
          results.push({ ok: true, dest: targetPath })
        } catch {
          results.push({ ok: false, dest: '' })
        }
      }
      return results
    } catch {
      return []
    }
  })

  ipcMain.handle('reset-icon-library-path', async () => {
    try {
      const dir = 'd:\\codes\\图标替换助手\\iconlibrary'
      store.set('iconLibraryPath', dir)
      ensureDir(dir)
      return { ok: true, path: dir }
    } catch {
      return { ok: false, path: '' }
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})