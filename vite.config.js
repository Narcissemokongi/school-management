// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@convex': path.resolve(__dirname, 'convex'),
    },
    dedupe: ['react', 'react-dom'],
  },

  server: {
    allowedHosts: ["localhost", ".trycloudflare.com"],
  },

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

  build: {
    // ✅ Cible moderne (ESM) pour les navigateurs récents
    target: ['es2020', 'safari14', 'ios14', 'chrome90', 'firefox88'],

    // ✅ Force esbuild (Oxc produit du code hostile à WebKit)
    minify: 'esbuild',

    // ✅ Cible CSS compatible iOS
    cssTarget: ['safari14', 'ios14'],

    // ✅ Force la cible pour les workers
    worker: {
      format: 'es',
      target: 'es2020',
    },

    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      maxParallelFileOps: 2,
    },
  },

  plugins: [
    react(),

    // ✅ Plugin legacy — génère une version compatible Safari 14 / iOS 14
    // IMPORTANT : doit être placé AVANT VitePWA
    legacy({
      targets: ['safari >= 14', 'ios >= 14', 'chrome >= 90', 'firefox >= 88'],
      // Polyfills modernes pour les navigateurs qui supportent ESM
      // mais pas certaines APIs récentes
      modernPolyfills: true,
      // Polyfills legacy (pour les navigateurs sans ESM)
      renderLegacyChunks: true,
    }),

    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        globIgnores: ['**/node_modules/**/*'],
        // ✅ Met à jour le SW immédiatement
        skipWaiting: true,
        clientsClaim: true,
        // ✅ Empêche le SW de servir un vieux HTML → écran blanc
        navigateFallback: null,
        // ✅ Supprime les anciens caches (fix chunks obsolètes)
        cleanupOutdatedCaches: true,
        // ✅ Ne pas précacher les fichiers legacy (trop gros)
        globIgnores: [
          '**/node_modules/**/*',
          '**/legacy-*.js',
          '**/polyfills-legacy-*.js',
        ],
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
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
});