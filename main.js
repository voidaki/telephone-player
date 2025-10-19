// main.js - Electron main process
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#1a1a1a',
    title: 'Audio Transformer Player'
  });

  mainWindow.loadFile('index.html');
  
  // Open DevTools for debugging (remove in production)
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle file selection
ipcMain.handle('select-audio-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Handle folder selection
ipcMain.handle('select-audio-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const folderPath = result.filePaths[0];
    const audioFiles = [];
    
    // Recursively find audio files
    function findAudioFiles(dir) {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          findAudioFiles(fullPath);
        } else {
          const ext = path.extname(file).toLowerCase();
          if (['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'].includes(ext)) {
            audioFiles.push(fullPath);
          }
        }
      });
    }
    
    findAudioFiles(folderPath);
    return audioFiles;
  }
  return [];
});

// Handle audio transformation
ipcMain.handle('transform-audio', async (event, inputFile) => {
  return new Promise((resolve, reject) => {
    // Generate output filename
    const parsedPath = path.parse(inputFile);
    const outputFile = path.join(parsedPath.dir, `${parsedPath.name}_telephone${parsedPath.ext}`);
    
    // TODO: Replace 'your_script.py' with your actual Python script path
    // Make sure Python is in your PATH, or use full path to python executable
    
    // Example: const pythonScript = path.join(__dirname, 'telephone_transform.py');
    const pythonScript = 'telephone.py'; // CHANGE THIS
    
    // Spawn Python process
    const pythonProcess = spawn('python', [pythonScript, inputFile, outputFile]);
    
    let errorOutput = '';
    
    // Capture stderr
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        // Success
        resolve({ success: true, outputFile: outputFile });
      } else {
        // Error
        reject({ success: false, error: errorOutput || 'Python script failed' });
      }
    });
    
    // Handle process errors
    pythonProcess.on('error', (err) => {
      reject({ success: false, error: err.message });
    });
  });
});

// Get file info
ipcMain.handle('get-file-info', async (event, filePath) => {
  const stats = fs.statSync(filePath);
  const parsed = path.parse(filePath);
  
  return {
    name: parsed.base,
    size: stats.size,
    path: filePath
  };
});
