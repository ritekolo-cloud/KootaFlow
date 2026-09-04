import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';

function syncDistToRoot(): Plugin {
  return {
    name: 'sync-dist-to-root',
    closeBundle() {
      const frontendDist = path.resolve(__dirname, 'dist');
      const rootDist = path.resolve(__dirname, '../dist');
      try {
        if (fs.existsSync(frontendDist)) {
          fs.cpSync(frontendDist, rootDist, { recursive: true, force: true });
        }
      } catch (err) {
        console.warn('[sync-dist-to-root] Warning copying frontend/dist to dist:', err);
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    syncDistToRoot(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
