const { spawn } = require('child_process');
const waitOn = require('wait-on');

async function startElectron() {
  console.log('⏳ Waiting for Vite dev server to be ready...');
  
  try {
    // Try multiple ports since Vite may use a different port if 3000 is occupied
    const ports = [3000, 3001, 3002, 3003];
    let serverUrl = null;
    
    for (const port of ports) {
      try {
        await waitOn({
          resources: [`http://localhost:${port}`],
          timeout: 5000,
          interval: 500,
        });
        serverUrl = `http://localhost:${port}`;
        break;
      } catch (e) {
        // Try next port
      }
    }
    
    if (!serverUrl) {
      throw new Error('Could not find Vite dev server on ports 3000-3003');
    }
    
    const isWindows = process.platform === 'win32';
    const electronCmd = isWindows ? 'electron.cmd' : 'electron';
    
    console.log(`✅ Vite server is ready at ${serverUrl}`);
    console.log('🚀 Starting Electron...');
    console.log('Platform:', process.platform);
    console.log('Command:', electronCmd, '.');
    console.log('Working directory:', process.cwd());
    
    const electron = spawn(
      electronCmd,
      ['.'],
      {
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, NODE_ENV: 'development', VITE_DEV_SERVER_URL: serverUrl }
      }
    );
    
    electron.on('error', (error) => {
      console.error('❌ Failed to start Electron:', error);
      process.exit(1);
    });
    
    electron.on('close', (code) => {
      if (code !== 0) {
        console.log(`❌ Electron process exited with error code ${code}`);
        process.exit(code);
      } else {
        console.log('✅ Electron window was closed by user');
        process.exit(0);
      }
    });
    
  } catch (error) {
    console.error('❌ Error starting Electron:', error);
    process.exit(1);
  }
}

startElectron();
