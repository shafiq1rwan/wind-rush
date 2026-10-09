import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the production build works from any static host / sub-folder (e.g. web portals).
  base: './',
  server: {
    port: 5173,
  },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    // Phaser itself is ~1.2 MB minified; keep it in its own chunk and silence the size warning.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
});
