const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  pickFolders: () => ipcRenderer.invoke('pick-folders'),
  pickIcon: () => ipcRenderer.invoke('pick-icon'),
  pickIcons: () => ipcRenderer.invoke('pick-icons'),
  pickShortcut: () => ipcRenderer.invoke('pick-shortcut'),
  pickShortcuts: () => ipcRenderer.invoke('pick-shortcuts'),
  pickApplication: () => ipcRenderer.invoke('pick-application'),
  applyIcon: (folder, icon) => ipcRenderer.invoke('apply-icon', folder, icon),
  applyShortcutIcon: (lnk, icon) => ipcRenderer.invoke('apply-shortcut-icon', lnk, icon),
  getIconPreview: (iconPath) => ipcRenderer.invoke('get-icon-preview', iconPath),
  getFolderPreview: (folderPath) => ipcRenderer.invoke('get-folder-preview', folderPath),
  getShortcutPreview: (lnkPath) => ipcRenderer.invoke('get-shortcut-preview', lnkPath),
  getFileIconPreview: (filePath) => ipcRenderer.invoke('get-file-icon-preview', filePath),
  getFileIconPreviews: (filePath, index) => ipcRenderer.invoke('get-file-icon-previews', filePath, index),
  getIconLibraryPath: () => ipcRenderer.invoke('get-icon-library-path'),
  chooseIconLibraryFolder: () => ipcRenderer.invoke('choose-icon-library-folder'),
  listIcons: () => ipcRenderer.invoke('list-icons'),
  importIcon: (srcPath) => ipcRenderer.invoke('import-icon', srcPath),
  extractIconToLibrary: (srcPath, index, size) => ipcRenderer.invoke('extract-icon-to-library', srcPath, index, size),
  openIconLibraryFolder: () => ipcRenderer.invoke('open-icon-library-folder')
  ,resetIconLibraryPath: () => ipcRenderer.invoke('reset-icon-library-path')
  ,restoreIcon: (folder) => ipcRenderer.invoke('restore-icon', folder)
  ,restoreShortcutIcon: (lnk) => ipcRenderer.invoke('restore-shortcut-icon', lnk)
  ,windowMinimize: () => ipcRenderer.invoke('window-minimize')
  ,windowToggleMaximize: () => ipcRenderer.invoke('window-toggle-maximize')
  ,windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized')
  ,windowClose: () => ipcRenderer.invoke('window-close')
})
