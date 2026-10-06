// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
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
    // ✅ Cible compatible Safari / iOS (au lieu de 'esnext' qui casse Safari)
    target: ['es2020', 'safari14', 'ios14', 'chrome90', 'firefox88'],

    // ✅ Force esbuild (Oxc produit du code hostile à WebKit)
    minify: 'esbuild',

    // ✅ Cible CSS compatible iOS (dvh, :has(), nesting)
    cssTarget: ['safari14', 'ios14'],

    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      maxParallelFileOps: 2,
    },
  },

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        globIgnores: ['**/node_modules/**/*'],
        // ✅ Met à jour le SW immédiatement (évite le vieux cache)
        skipWaiting: true,
        clientsClaim: true,
        // ✅ Empêche le SW de servir un vieux HTML → écran blanc
        navigateFallback: null,
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