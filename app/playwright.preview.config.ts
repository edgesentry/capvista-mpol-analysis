import base from "./playwright.config";
import { defineConfig, devices } from "@playwright/test";

const PREVIEW_PORT = 4173;

const chromiumDevice = process.env.CI
  ? devices["Desktop Chrome"]
  : { ...devices["Desktop Chrome"], channel: "chrome" as const };

export default defineConfig({
  ...base,
  testMatch: "**/analyst-brief-preview.spec.ts",
  projects: [{ name: "chromium-preview", use: { ...chromiumDevice, baseURL: `http://127.0.0.1:${PREVIEW_PORT}` } }],
  webServer: {
    command: "npm run build:e2e && npm run preview:e2e",
    url: `http://127.0.0.1:${PREVIEW_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
