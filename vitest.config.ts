import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/lib/**', 'src/store/**', 'src/hooks/**'],
      exclude: [
        'src/lib/supabase.ts', // bara env-config, inte testbar isolerat
      ],
      thresholds: {
        // Trösklar ökas per issue när tester skrivs:
        // issue #5 → recipes.ts täckt
        // issue #6 → inventoryStore.ts täckt
        // issue #7 → useScanner.ts täckt
        'src/lib/recipes.ts': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
      },
    },
  },
})
