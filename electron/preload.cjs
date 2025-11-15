const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  pickIcon: () => ipcRenderer.invoke('pick-icon'),
  applyIcon: (folder, icon) => ipcRenderer.invoke('apply-icon', folder, icon),
  getIconPreview: (iconPath) => ipcRenderer.invoke('get-icon-preview', iconPath),
  getFolderPreview: (folderPath) => ipcRenderer.invoke('get-folder-preview', folderPath)
})