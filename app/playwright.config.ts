import { defineConfig, devices } from "@playwright/test";

// Incomplete browser cache when Cursor sandbox sets PLAYWRIGHT_BROWSERS_PATH.
if (process.env.PLAYWRIGHT_BROWSERS_PATH?.includes("cursor-sandbox-cache")) {
  delete process.env.PLAYWRIGHT_BROWSERS_PATH;
}

const DEV_PORT = 5173;

const chromiumDevice = process.env.CI
  ? devices["Desktop Chrome"]
  : { ...devices["Desktop Chrome"], channel: "chrome" as const };

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 120_000,
  use: {
    baseURL: `http://127.0.0.1:${DEV_PORT}`,
    trace: "on-first-retry",
    video: "off",
    // PWA caches R2 Parquet; block SW so route/mock and fixtures are deterministic.
    serviceWorkers: "block",
  },
  testIgnore: "**/analyst-brief-preview.spec.ts",
  projects: [{ name: "chromium", use: chromiumDevice }],
  webServer: {
    command: "npm run dev:e2e",
    url: `http://127.0.0.1:${DEV_PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
