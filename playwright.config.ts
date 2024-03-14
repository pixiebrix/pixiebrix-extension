import { defineConfig } from "@playwright/test";
import { CI } from "./end-to-end-tests/env";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./end-to-end-tests",
  outputDir: "./end-to-end-tests/.output",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: Boolean(CI),
  /* Retry on CI only to catch flakiness */
  retries: CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: CI ? 1 : undefined,
  /* Timeout for each test */
  timeout: 30_000,
  expect: {
    /* Timeout for each assertion. Increased from the default of 5000 due to Extension Console loading times. */
    timeout: 10_000,
  },
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [["html", { outputFolder: "./end-to-end-tests/.report" }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "https://pbx.vercel.app",

    /* Collect trace when retrying the failed test in CI, and always on failure when running locally. See https://playwright.dev/docs/trace-viewer */
    trace: CI ? "on-first-retry" : "retain-on-failure",
  },
  /* Configure projects for major browsers */
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      dependencies: ["setup"],
    },
  ],
});
