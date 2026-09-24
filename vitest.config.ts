import { configDefaults, defineConfig } from 'vitest/config';

/**
 * Unit tests: fully mocked, no network, 100% coverage enforced.
 * Integration tests live in test/integration and run with `npm run test:integration`.
 */
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: [...configDefaults.exclude, 'test/integration/**'],
    environment: 'node',
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
