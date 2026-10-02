import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
  publicDir: false,
  plugins: [
    react(),
    dts({
      include: ['src/Components/**/*', 'src/hooks/**/*'],
      exclude: ['src/**/__tests__/**', 'src/**/*.test.ts'],
      // one self-contained index.d.ts: no extension-less relative imports, so it resolves under
      // every moduleResolution (node16/nodenext included); finish-build copies it to index.d.cts
      rollupTypes: true,
      tsconfigPath: './tsconfig.app.json',
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/Components/index.ts'),
      formats: ['es', 'cjs'],
      // "type": "module" makes every .js file ESM, so the CommonJS build must be .cjs
      fileName: (format) => (format === 'cjs' ? 'index.cjs' : 'index.es.js'),
      cssFileName: 'react-table-dnd',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
})
