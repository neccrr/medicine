import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['pwa-icon.svg'],
      manifest: {
        name: 'Medicine — Study Tool',
        short_name: 'Medicine',
        description:
          'Flashcards, quizzes, ebooks, and summaries — fully offline, zero backend.',
        theme_color: '#0a0f0d',
        background_color: '#0a0f0d',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,woff2,pdf}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    assetsInlineLimit: (filePath) => (filePath.endsWith('.pdf') ? false : undefined),
    rollupOptions: {
      output: {
        // React/react-dom/react-router change far less often than app code —
        // splitting them out keeps that chunk cacheable across deploys instead
        // of re-downloading it every time any page's code changes.
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) {
            return 'vendor';
          }
        },
      },
    },
  },
})
