import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path'; // <-- Ajout pour l'alias

export default defineConfig({
  // Alias pour importer depuis "src" avec "@"
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // Alias pour importer depuis le dossier "convex" à la racine
      '@convex': path.resolve(__dirname, 'convex'),
    },
  },

  server: {
    allowedHosts: ["localhost", ".trycloudflare.com"],
  },

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Évite l'erreur de cache sur les fichiers trop gros
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
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
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
});