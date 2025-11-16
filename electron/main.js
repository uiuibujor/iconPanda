import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { execFile, execFileSync } from 'node:child_process'
import Store from 'electron-store'

const store = new Store({ name: 'settings' })

function ensureDir(dir) {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  } catch {}
}

function getIconLibraryPath() {
  let dir = store.get('iconLibraryPath')
  if (typeof dir !== 'string' || !dir) {
    const projectIcons = path.join(process.cwd(), 'icons')
    dir = projectIcons
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

function createWindow() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1035,
    minHeight: 600,
    frame: false,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  Menu.setApplicationMenu(null)
  try { win.setMenuBarVisibility(false) } catch {}
  const devUrl = 'http://localhost:5173'
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

  ipcMain.handle('get-icon-preview', async (_e, iconPath) => {
    try {
      if (!iconPath) return { ok: false, dataUrl: '', size: 0 }
      if (!fs.existsSync(iconPath)) return { ok: false, dataUrl: '', size: 0 }
      const buf = fs.readFileSync(iconPath)
      const b64 = buf.toString('base64')
      const dataUrl = `data:image/x-icon;base64,${b64}`
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

  ipcMain.handle('open-icon-library-folder', async () => {
    try {
      const dir = getIconLibraryPath()
      const err = await shell.openPath(dir)
      return { ok: !err }
    } catch {
      return { ok: false }
    }
  })

  ipcMain.handle('reset-icon-library-path', async () => {
    try {
      const dir = path.join(process.cwd(), 'icons')
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