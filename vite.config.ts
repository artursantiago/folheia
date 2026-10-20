/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import { pdfjsAssets } from './build/pdfjsAssets.ts';

const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

// A relative base lets the same build run on GitHub Pages (under /folheia/),
// any other static host, and later inside a Capacitor WebView.
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    pdfjsAssets(),
    // Web only: a native (Capacitor) build ships the files itself.
    ...(process.env.FOLHEIA_NATIVE
      ? []
      : [
          VitePWA({
            registerType: 'prompt',
            injectRegister: false,
            includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
            manifest: {
              name: 'Folheia',
              short_name: 'Folheia',
              description:
                'Leitor de PDF e CBZ em formato de livro. Seu arquivo não sai do seu aparelho.',
              lang: 'pt-BR',
              start_url: './',
              scope: './',
              display: 'standalone',
              background_color: '#12161D',
              theme_color: '#12161D',
              icons: [
                { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                {
                  src: 'icons/maskable-512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'maskable',
                },
              ],
              file_handlers: [
                {
                  action: './',
                  accept: {
                    'application/pdf': ['.pdf'],
                    'application/vnd.comicbook+zip': ['.cbz'],
                  },
                },
              ],
              launch_handler: { client_mode: 'focus-existing' },
            },
            workbox: {
              // Only the app itself: books and examples are never pre-cached.
              globPatterns: ['**/*.{js,css,html,svg,png,woff2,wasm,bcmap,pfb,icc}'],
              maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
              navigateFallback: 'index.html',
            },
          }),
        ]),
  ],
  build: {
    target: ['safari18', 'chrome130', 'edge130', 'firefox130'],
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
