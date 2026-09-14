import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: true,
  workers: 2,
  use: {
    browserName: process.env.PLAYWRIGHT_BROWSER === 'webkit' ? 'webkit' : 'chromium',
    baseURL: process.env.PREVIEW_URL || 'http://127.0.0.1:4321',
    viewport: { width: 1440, height: 960 },
    launchOptions: process.env.PLAYWRIGHT_BROWSER === 'webkit' ? {} : { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, args: ['--enable-unsafe-swiftshader'] },
    trace: 'retain-on-failure',
  },
  reporter: [['list']],
});
