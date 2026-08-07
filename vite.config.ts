import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  // Listen on every interface so a phone on the same network can reach the
  // dev and preview servers without passing --host each time.
  server: { host: true },
  // allowedHosts covers one-off Cloudflare quick tunnels, which serve the
  // built app over HTTPS so the service worker can register and install.
  preview: { host: true, allowedHosts: ['.trycloudflare.com'] },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Levantry — Hebrew + Levantine Arabic Flashcards',
        short_name: 'Levantry',
        description: 'Strict dual-language flashcard drilling for Hebrew and Levantine Arabic.',
        theme_color: '#191510',
        background_color: '#191510',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Pronunciation clips are precached rather than fetched on demand:
        // the whole point is that a learner with no connection can still hear
        // every word. They are short and mono, so the set stays modest.
        globPatterns: ['**/*.{js,css,html,svg,woff2,mp3}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/\/assets\/audio\//],
      },
    }),
  ],
});
