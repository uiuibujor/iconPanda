import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { execFile } from 'node:child_process'

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  const devUrl = 'http://localhost:5173'
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadURL(devUrl)
  }
}

function ensureDesktopIni(folder: string, iconPath: string) {
  const iniPath = path.join(folder, 'desktop.ini')
  const content = `[.ShellClassInfo]\nIconFile=${iconPath}\nIconIndex=0\n`
  fs.writeFileSync(iniPath, content, { encoding: 'utf8' })
  execFile('attrib', ['+h', '+s', iniPath])
}

function setFolderAttributes(folder: string) {
  execFile('attrib', ['+s', '+r', folder])
}

function copyIconToFolder(folder: string, sourceIcon: string) {
  const target = path.join(folder, '.folder.ico')
  fs.copyFileSync(sourceIcon, target)
  return target
}

function refreshIconCache() {
  const sysRoot = process.env.SystemRoot || 'C\\\Windows'
  const ie4u = path.join(sysRoot, 'System32', 'ie4uinit.exe')
  if (fs.existsSync(ie4u)) {
    execFile(ie4u, ['-ClearIconCache'])
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

  ipcMain.handle('apply-icon', async (_e, folder: string, icon: string) => {
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