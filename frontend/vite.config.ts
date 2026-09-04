import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';

const productionApiUrl = 'https://kootaflow-production-api.onrender.com/api';
const legacyProductionApiServiceNames = new Set(['kootaflow', 'kootaflow-server']);

function normalizeApiUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

function isLegacyProductionApiUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.pathname.replace(/\/+$/, '') === '/api' &&
      legacyProductionApiServiceNames.has(parsed.hostname.replace(/\.onrender\.com$/, ''))
    );
  } catch {
    return false;
  }
}

function validateProductionApiUrl(): Plugin {
  return {
    name: 'validate-production-api-url',
    configResolved(config) {
      if (config.command !== 'build' || config.mode !== 'production') return;

      const env = loadEnv(config.mode, __dirname, '');
      const configuredApiUrl = env.VITE_API_URL?.trim();

      if (!configuredApiUrl) {
        throw new Error(`VITE_API_URL must be set to ${productionApiUrl} for production builds.`);
      }

      const normalizedApiUrl = normalizeApiUrl(configuredApiUrl);

      if (isLegacyProductionApiUrl(normalizedApiUrl)) {
        throw new Error(`Refusing to build with obsolete VITE_API_URL: ${normalizedApiUrl}`);
      }

      if (normalizedApiUrl !== productionApiUrl) {
        throw new Error(
          `VITE_API_URL must be ${productionApiUrl} for production builds, got ${normalizedApiUrl}.`
        );
      }
    },
  };
}

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
    validateProductionApiUrl(),
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
