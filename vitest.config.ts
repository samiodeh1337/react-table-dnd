import { defineConfig } from 'vitest/config'

// Pure-logic tests only (no DOM): src/hooks/drag/* and Components/utils.
export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
  },
})
