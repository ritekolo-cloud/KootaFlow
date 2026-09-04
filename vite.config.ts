import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

// Plugin to ensure built files exist in both ./dist and ./frontend/dist
// so that Render succeeds whether Publish Directory is 'dist' or 'frontend/dist'
function syncDistPlugin(): Plugin {
  return {
    name: 'sync-dist-plugin',
    closeBundle() {
      const rootDist = path.resolve(__dirname, 'dist')
      const frontendDist = path.resolve(__dirname, 'frontend/dist')
      try {
        if (fs.existsSync(rootDist)) {
          fs.cpSync(rootDist, frontendDist, { recursive: true, force: true })
        }
      } catch (err) {
        console.warn('[sync-dist-plugin] Warning copying dist to frontend/dist:', err)
      }
    },
  }
}

// This config is used when Vite is invoked from the repository root
// (e.g. `node node_modules/vite/bin/vite.js build`).
// It delegates to the KootaFlow frontend at ./frontend/
export default defineConfig({
  root: path.resolve(__dirname, 'frontend'),
  plugins: [
    react(),
    tailwindcss(),
    syncDistPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'frontend/src'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
})
