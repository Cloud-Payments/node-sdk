import { defineConfig } from 'vitest/config';

/**
 * Integration tests: real requests against your sandbox gateway.
 *
 * Set GATEWAY_API_KEY and GATEWAY_BASE_URL (environment or .env) and run
 * `npm run test:integration`. Without credentials every suite is skipped.
 */
export default defineConfig({
  test: {
    include: ['test/integration/**/*.test.ts'],
    setupFiles: ['test/integration/setup.ts'],
    environment: 'node',
    // Authorizations can take well over a minute; mirror the SDK's default timeout.
    testTimeout: 180_000,
    hookTimeout: 180_000,
    // Run files one at a time to keep sandbox state predictable and avoid rate limits.
    fileParallelism: false,
    reporters: ['verbose'],
  },
});
