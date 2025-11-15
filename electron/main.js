import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { execFile, execFileSync } from 'node:child_process'

function createWindow() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  const devUrl = 'http://localhost:5173'
  win.loadURL(devUrl)
  win.webContents.openDevTools({ mode: 'detach' })
}

function ensureDesktopIni(folder, iconPath) {
  const iniPath = path.join(folder, 'desktop.ini')
  const content = `[.ShellClassInfo]\r\nIconFile=${iconPath}\r\nIconIndex=0\r\n`
  fs.writeFileSync(iniPath, content, { encoding: 'utf8' })
  try { execFileSync('attrib', ['+h', '+s', iniPath]) } catch {}
}

function setFolderAttributes(folder) {
  try { execFileSync('attrib', ['+s', '+r', folder]) } catch {}
}

function copyIconToFolder(folder, sourceIcon) {
  const target = path.join(folder, '.folder.ico')
  fs.copyFileSync(sourceIcon, target)
  return target
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

  ipcMain.handle('pick-folder', async () => {
    const res = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (res.canceled || res.filePaths.length === 0) return ''
    return res.filePaths[0]
  })

  ipcMain.handle('pick-icon', async () => {
    const res = await dialog.showOpenDialog({ filters: [{ name: 'Icons', extensions: ['ico'] }], properties: ['openFile'] })
    if (res.canceled || res.filePaths.length === 0) return ''
    return res.filePaths[0]
  })

  ipcMain.handle('apply-icon', async (_e, folder, icon) => {
    if (!folder || !icon) return false
    const copied = copyIconToFolder(folder, icon)
    const rel = path.basename(copied)
    ensureDesktopIni(folder, rel)
    setFolderAttributes(folder)
    refreshIconCache()
    return true
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})