// Simple test to verify Electron window stays open
const { app, BrowserWindow } = require('electron');

let mainWindow;

function createWindow() {
  console.log('🚀 Creating test window...');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  console.log('📍 Loading http://localhost:3000');
  mainWindow.loadURL('http://localhost:3000');
  mainWindow.webContents.openDevTools();

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Page loaded successfully!');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ Failed to load:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    console.log('👋 Window closed');
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  console.log('⚡ Electron app is ready');
  createWindow();
});

app.on('window-all-closed', () => {
  console.log('🛑 All windows closed, quitting app');
  app.quit();
});

console.log('🎬 Starting Electron test...');
