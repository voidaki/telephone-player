// preload.js - Secure bridge between main and renderer process
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  selectAudioFile: () => ipcRenderer.invoke('select-audio-file'),
  selectAudioFolder: () => ipcRenderer.invoke('select-audio-folder'),
  transformAudio: (filePath) => ipcRenderer.invoke('transform-audio', filePath),
  getFileInfo: (filePath) => ipcRenderer.invoke('get-file-info', filePath)
});
