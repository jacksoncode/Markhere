import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: ['es2021', 'chrome100', 'safari13'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    outDir: 'dist',
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-tiptap': [
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-placeholder',
            '@tiptap/extension-highlight',
            '@tiptap/extension-link',
            '@tiptap/extension-image',
            '@tiptap/extension-table',
            '@tiptap/extension-task-list',
            '@tiptap/extension-task-item',
            '@tiptap/extension-underline',
          ],
          'vendor-tauri': [
            '@tauri-apps/api/core',
            '@tauri-apps/api/event',
            '@tauri-apps/api/window',
            '@tauri-apps/api/path',
            '@tauri-apps/api/dpi',
            '@tauri-apps/api/image',
            '@tauri-apps/plugin-dialog',
            '@tauri-apps/plugin-fs',
            '@tauri-apps/plugin-shell',
            '@tauri-apps/plugin-updater',
          ],
          'vendor-mermaid': ['mermaid'],
          'vendor-katex': ['katex'],
          'vendor-prism': ['prismjs'],
          'vendor-yjs': ['yjs', 'y-webrtc'],
          'vendor-emoji': ['emoji-picker-react'],
          'vendor-lodash': ['lodash-es'],
        },
      },
    },
  },
  esbuild: process.env.NODE_ENV === 'production' ? {
    pure: ['console.log', 'console.warn', 'console.debug'],
    drop: ['debugger'],
  } : {},
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
