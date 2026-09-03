import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// This config is used when Vite is invoked from the repository root
// (e.g. `node node_modules/vite/bin/vite.js build`).
// It delegates to the KootaFlow frontend at ./frontend/
export default defineConfig({
  root: path.resolve(__dirname, 'frontend'),
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'frontend/src'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'frontend/dist'),
    emptyOutDir: true,
  },
})
