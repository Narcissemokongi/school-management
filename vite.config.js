// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ✅ En ESM, on recrée __dirname manuellement
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  // ────────────────────────────────────────────────
  // Alias pour importer depuis "src" avec "@"
  // ────────────────────────────────────────────────
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@convex': path.resolve(__dirname, 'convex'),
    },
    // ✨ Force une seule copie de React
    dedupe: ['react', 'react-dom'],
  },

  // ────────────────────────────────────────────────
  // Serveur dev
  // ────────────────────────────────────────────────
  server: {
    allowedHosts: ["localhost", ".trycloudflare.com"],
  },

  // ✨ Optimisation des dépendances (réduit la mémoire)
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'convex/react',
      'zustand',
      'lucide-react',
      'recharts',
      'react-hot-toast',
    ],
    exclude: ['@capacitor/core', '@capacitor/app'],
  },

  // ✨ Optimisation du build (réduit la mémoire du bundler)
  build: {
    target: 'esnext',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      maxParallelFileOps: 2,
    },
  },

  // ────────────────────────────────────────────────
  // Plugins
  // ────────────────────────────────────────────────
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,  // ✅ 8 MB (fix Vercel)
        // ✨ Exclure les gros fichiers du cache PWA
        globIgnores: ['**/node_modules/**/*'],
      },
      manifest: {
        name: 'School Management',
        short_name: 'SM',
        description: 'Gestion de la discipline scolaire',
        theme_color: '#4f46e5',
        background_color: '#f5f7fb',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
});