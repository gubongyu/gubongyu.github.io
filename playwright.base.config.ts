import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  testMatch: 'base-path.spec.ts',
  outputDir: 'test-results/base',
  use: { baseURL: 'http://127.0.0.1:4322', headless: true, reducedMotion: 'reduce' },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4322 --ignore-lock',
    url: 'http://127.0.0.1:4322/profile/',
    reuseExistingServer: false,
    env: { BASE_PATH: '/profile/', ASTRO_TELEMETRY_DISABLED: '1' },
  },
});
