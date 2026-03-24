import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  plugins: [react()],
  define: {
    __LIB_VERSION__: JSON.stringify(pkg.version),
  },
  base: './',
  build: {
    outDir: 'docs-dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
  },
})
