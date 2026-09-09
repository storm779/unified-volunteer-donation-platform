import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5174',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'node e2e/server.mjs',
      url: 'http://127.0.0.1:5100/api/health',
      timeout: 20000,
      reuseExistingServer: false,
    },
    {
      command:
        'node client/node_modules/vite/bin/vite.js client --host 127.0.0.1 --port 5174 --strictPort',
      url: 'http://localhost:5174',
      timeout: 30000,
      reuseExistingServer: false,
      env: { VITE_APP_MODE: 'demo', VITE_API_URL: 'http://localhost:5100/api' },
    },
  ],
});
