import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    env: {
      DATABASE_URL: 'file:./test.db',
    },
    // Server tests share one SQLite file, so run files sequentially
    fileParallelism: false,
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          environment: 'node',
          include: ['__tests__/server/**/*.test.ts'],
          globalSetup: ['__tests__/setup/global-db.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['__tests__/ui/**/*.test.tsx'],
          setupFiles: ['__tests__/setup/jest-dom.ts'],
        },
      },
    ],
  },
})
