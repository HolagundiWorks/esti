import { defineConfig, devices } from "@playwright/test";

/**
 * AORMS browser automation. Targets the running demo build (persona login) at
 * AORMS_BASE_URL (default the dev frontend on :5173). Override for other envs:
 *   AORMS_BASE_URL=https://app.example.com pnpm test
 */
const BASE_URL = process.env.AORMS_BASE_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Sweeps share one app instance — keep them serial + deterministic.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 12_000,
  },
  projects: [
    // Logs in once and saves the session so the button crawler can reuse it.
    { name: "setup", testMatch: /auth\.setup\.ts$/ },
    // Auth / navigation / PDF specs sign in fresh themselves.
    {
      name: "office",
      testMatch: /(auth|navigation.*|pdf)\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    // The button crawler + CRUD item-entry specs reuse the saved session.
    {
      name: "buttons",
      testMatch: /buttons\.spec\.ts$/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: ".auth/principal.json" },
    },
    {
      name: "crud",
      testMatch: /crud.*\.spec\.ts$/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: ".auth/principal.json" },
    },
    {
      name: "accessibility",
      testMatch: /accessibility\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
