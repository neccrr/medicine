import type { IncomingMessage, ServerResponse } from 'node:http'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Serves the real API (server/app.ts) from the Vite dev server when MEDICINE_API=memory or
// MONGODB_URI is set (`npm run dev:api`). Plain `npm run dev` stays a static, guest-only app.
function devApi(): Plugin {
  return {
    name: 'medicine-dev-api',
    apply: 'serve',
    configureServer(server) {
      if (process.env.MEDICINE_API !== 'memory' && !process.env.MONGODB_URI) return
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (!req.url?.startsWith('/api/')) return next()
        try {
          const { getDevApp } = await server.ssrLoadModule('/server/devApi.ts')
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) {
            if (Array.isArray(v)) v.forEach((x) => headers.append(k, x))
            else if (v !== undefined) headers.set(k, v)
          }
          const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
          const request = new Request(`http://${req.headers.host}${req.url}`, {
            method: req.method,
            headers,
            body: hasBody ? Buffer.concat(chunks) : undefined,
          })
          const response: Response = await (await getDevApp())(request)
          res.statusCode = response.status
          response.headers.forEach((value, key) => {
            if (key !== 'set-cookie') res.setHeader(key, value)
          })
          const cookies = response.headers.getSetCookie()
          if (cookies.length) res.setHeader('set-cookie', cookies)
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          console.error(err)
          res.statusCode = 500
          res.end('Dev API error')
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    devApi(),
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
        // /api/ must reach the network too: the Google sign-in callback is a full navigation.
        navigateFallbackDenylist: [/\/assets\//, /^\/api\//],
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
          {
            // Ebook slide figures (~7.5MB total) are cached as each chapter is read rather
            // than precached, for the same first-visit reason as the PDFs above.
            urlPattern: ({ url }) => url.pathname.startsWith('/ebook-figures/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'ebook-figure-cache',
              expiration: {
                maxEntries: 400,
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
