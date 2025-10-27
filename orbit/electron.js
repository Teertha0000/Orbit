const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Only load dotenv in development
if (process.env.NODE_ENV === 'development') {
  require('dotenv').config();
}

let mainWindow;

// Simple persistent storage for API key
function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

// Load config from file
function loadConfig() {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load config:', e);
  }
  return {};
}

// Save config to file
function saveConfig(config) {
  try {
    const configPath = getConfigPath();
    const userDataPath = app.getPath('userData');
    // Ensure directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log('✅ Config saved to:', configPath);
    return true;
  } catch (e) {
    console.error('❌ Failed to save config:', e);
    return false;
  }
}

function createWindow() {
  console.log('Creating Electron window...');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('API_KEY present:', !!process.env.API_KEY);
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#000000',
    show: false, // Don't show until ready
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    frame: true,
    titleBarStyle: 'default',
    icon: path.join(__dirname, 'assets', 'icon.png'), // You can add an icon later
  });

  // Load the app
  const isDev = process.env.NODE_ENV === 'development';
  
  console.log('isDev:', isDev);
  
  if (isDev) {
    // In development, load from Vite dev server
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
    console.log('Loading from Vite dev server:', devServerUrl);
    mainWindow.loadURL(devServerUrl);
    // DevTools removed - can be opened manually with Ctrl+Shift+I
  } else {
    // In production, load the built files
    console.log('Loading from built files');
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    console.log('Window closed event');
    mainWindow = null;
  });

  mainWindow.on('ready-to-show', () => {
    console.log('Window ready to show');
    mainWindow.show();
  });

  // Add error logging for load failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Page loaded successfully');
  });

  // Open links in a new Electron window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Create a new window for the link
    if (url.startsWith('http://') || url.startsWith('https://')) {
      createLinkWindow(url);
      return { action: 'deny' }; // Prevent default behavior
    }
    return { action: 'allow' };
  });

  // Handle navigation to external links - open in new window
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Allow navigation within the dev server or built app
    const isDev = process.env.NODE_ENV === 'development';
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
    
    if (isDev && url.startsWith(devServerUrl)) {
      return; // Allow navigation within dev server
    }
    
    if (!isDev && url.startsWith('file://')) {
      return; // Allow navigation within built app
    }
    
    // Open external links in new window instead of navigating
    if (url.startsWith('http://') || url.startsWith('https://')) {
      event.preventDefault();
      createLinkWindow(url);
    }
  });
}

// Create a new window for opening links
function createLinkWindow(url) {
  console.log('Opening link in new window:', url);
  
  const linkWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    autoHideMenuBar: true, // Hide menu bar
  });

  // Load the URL
  linkWindow.loadURL(url);
  
  // Prevent links in this window from opening more windows
  linkWindow.webContents.setWindowOpenHandler(({ url: newUrl }) => {
    // If user clicks another link, navigate in the same window
    linkWindow.loadURL(newUrl);
    return { action: 'deny' };
  });
  
  linkWindow.on('closed', () => {
    console.log('Link window closed');
  });
}

// IPC Handlers - Handle API key requests from renderer
ipcMain.handle('get-api-key', () => {
  // Priority: saved config > environment variable
  const config = loadConfig();
  const apiKey = config.apiKey || process.env.API_KEY || process.env.VITE_API_KEY;
  console.log('🔑 API Key requested. Using:', apiKey ? 'saved/env key' : 'none');
  return apiKey;
});

ipcMain.handle('set-api-key', (event, apiKey) => {
  console.log('🔑 Setting new API key...');
  const config = loadConfig();
  config.apiKey = apiKey;
  const success = saveConfig(config);
  if (success) {
    console.log('✅ API key saved successfully');
    // Notify renderer that API key was updated
    if (mainWindow) {
      mainWindow.webContents.send('api-key-updated', apiKey);
    }
  }
  return success;
});

// Quit when all windows are closed (register BEFORE app.whenReady)
app.on('window-all-closed', () => {
  console.log('All windows closed event triggered');
  // On macOS, apps typically stay active until explicitly quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked and no windows exist
  console.log('Activate event triggered');
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  console.log('Electron app is ready');
  // Remove the menu bar (File, Edit, View, etc.)
  Menu.setApplicationMenu(null);
  createWindow();
}).catch((err) => {
  console.error('Error during app initialization:', err);
});

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
