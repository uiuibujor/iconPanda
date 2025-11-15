const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  pickFolders: () => ipcRenderer.invoke('pick-folders'),
  pickIcon: () => ipcRenderer.invoke('pick-icon'),
  applyIcon: (folder, icon) => ipcRenderer.invoke('apply-icon', folder, icon),
  getIconPreview: (iconPath) => ipcRenderer.invoke('get-icon-preview', iconPath),
  getFolderPreview: (folderPath) => ipcRenderer.invoke('get-folder-preview', folderPath),
  getIconLibraryPath: () => ipcRenderer.invoke('get-icon-library-path'),
  chooseIconLibraryFolder: () => ipcRenderer.invoke('choose-icon-library-folder'),
  listIcons: () => ipcRenderer.invoke('list-icons'),
  importIcon: (srcPath) => ipcRenderer.invoke('import-icon', srcPath),
  openIconLibraryFolder: () => ipcRenderer.invoke('open-icon-library-folder')
  ,resetIconLibraryPath: () => ipcRenderer.invoke('reset-icon-library-path')
  ,restoreIcon: (folder) => ipcRenderer.invoke('restore-icon', folder)
  ,windowMinimize: () => ipcRenderer.invoke('window-minimize')
  ,windowToggleMaximize: () => ipcRenderer.invoke('window-toggle-maximize')
  ,windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized')
  ,windowClose: () => ipcRenderer.invoke('window-close')
})