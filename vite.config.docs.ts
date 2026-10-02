import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json' with { type: 'json' }

// The docs site only. Tailwind and shadcn/ui live here; the library build (vite.config.ts) never
// sees them, so the published package keeps zero runtime dependencies.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // index.html's structured data states the version: take it from package.json
    {
      name: 'lib-version-in-html',
      transformIndexHtml: (html) => html.replaceAll('%LIB_VERSION%', pkg.version),
    },
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  define: {
    __LIB_VERSION__: JSON.stringify(pkg.version),
  },
  base: './',
  build: {
    outDir: 'docs-dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 900, // docs site only (every demo + highlight.js + UI kit); not the library
  },
})
