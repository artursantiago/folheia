/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pdfjsAssets } from './build/pdfjsAssets.ts';

// A relative base lets the same build run on GitHub Pages (under /folheia/),
// any other static host, and later inside a Capacitor WebView.
export default defineConfig({
  base: './',
  plugins: [react(), pdfjsAssets()],
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
