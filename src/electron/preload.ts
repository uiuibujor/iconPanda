import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  pickIcon: () => ipcRenderer.invoke('pick-icon'),
  applyIcon: (folder: string, icon: string) => ipcRenderer.invoke('apply-icon', folder, icon)
})