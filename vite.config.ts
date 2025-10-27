import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
// FIX: Import loadEnv to access environment variables.
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// FIX: Load environment variables to make them available in the config.
export default defineConfig(({ mode }) => {
    // FIX: Replaced process.cwd() with '.' to resolve a TypeScript error.
    const env = loadEnv(mode, '.', '');
    return {
      base: './', // Important for Electron - use relative paths
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // FIX: Define process.env.API_KEY to expose it to the client-side code.
      define: {
        'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
          output: {
            manualChunks: undefined, // Better for Electron
          },
        },
      },
    };
});
