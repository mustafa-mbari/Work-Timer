import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        background: resolve(__dirname, 'src/background/background.ts'),
        content: resolve(__dirname, 'src/content/content.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: 'assets/[name].[ext]',
        manualChunks: {
          recharts: ['recharts'],
          xlsx: ['xlsx'],
          supabase: ['@supabase/supabase-js'],
          jspdf: ['jspdf', 'jspdf-autotable'],
        },
      },
    },
  },
  // Only strip console/debugger in production builds — keep them for dev debugging
  esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : {},
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'shared'),
    },
  },
}))
