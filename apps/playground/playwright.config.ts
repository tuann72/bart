import { defineConfig, devices } from "@playwright/test";

/**
 * Browser suite for the Bart playground. Both servers are started
 * automatically (and reused if already running locally): the Hono mock API on
 * :8787 and the Vite app on :5173. The mock model is deterministic, so these
 * tests exercise real streaming, tool approval, and DOM effects offline.
 */
export default defineConfig({
  testDir: "./e2e",
  // *.e2e.ts, not *.spec.ts/*.test.ts: `bun test` must never pick these up.
  testMatch: /.*\.e2e\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "bun server/index.ts",
      port: 8787,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "bun run dev",
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
