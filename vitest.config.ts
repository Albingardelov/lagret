import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
      process.env.VITE_SUPABASE_URL || 'http://localhost:54321'
    ),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
      process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key'
    ),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/lib/**', 'src/store/**', 'src/hooks/**'],
      exclude: [
        'src/lib/supabase.ts', // bara env-config, inte testbar isolerat
      ],
      thresholds: {
        'src/lib/recipes.ts': {
          lines: 80,
          functions: 80,
          branches: 70,
          statements: 80,
        },
        'src/store/inventoryStore.ts': {
          lines: 60,
          functions: 60,
          branches: 50,
          statements: 60,
        },
      },
    },
  },
})
