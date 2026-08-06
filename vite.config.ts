import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Hebrew + Levantine Arabic Flashcards',
        short_name: 'HE/AR Cards',
        description: 'Strict dual-language flashcard drilling for Hebrew and Levantine Arabic.',
        theme_color: '#0e1116',
        background_color: '#0e1116',
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
