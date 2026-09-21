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
        // PDFs (module lecture slides, ebook references) are excluded from the upfront
        // precache — content/modules alone already runs ~50MB, and forcing that onto every
        // first visit before anyone's opened a single module would be a bad trade for an
        // "offline-first" app that's supposed to load fast. Cached lazily instead, below.
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,woff2}'],
        cleanupOutdatedCaches: true,
        // Without this, the SPA navigate-fallback (needed so client-side routes like
        // /quizzes/histology work offline) also swallows iframe/direct navigation to a real
        // static file under /assets/ — e.g. opening a module PDF was silently served
        // index.html instead. Scoped to /assets/ specifically (not a general ".ext$" pattern)
        // since a route param can itself contain a dot, e.g. /exam/1.1.
        navigateFallbackDenylist: [/\/assets\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.pdf'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'pdf-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 180,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
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
