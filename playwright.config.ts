import { defineConfig } from "@playwright/test";
import { CI } from "./end-to-end-tests/env";
import fs from "node:fs";
import { getAuthProfilePathFile } from "./end-to-end-tests/fixtures/utils";

// Speed up local development by skipping the authentication setup if it's already done.
// NOTE: You will have to restart the test runner if you need to re-run the auth setup.
const isAuthSetupDone = (chromiumChannel: "msedge" | "chrome") => {
  if (CI) {
    return false;
  }

  const filePath = getAuthProfilePathFile(chromiumChannel);
  return fs.existsSync(filePath);
};

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig<{ chromiumChannel: string }>({
  testDir: "./end-to-end-tests",
  outputDir: "./end-to-end-tests/.output",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: Boolean(CI),
  /* Retry on CI only to catch flakiness */
  retries: CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: CI ? 1 : 2,
  /* Timeout for each test */
  timeout: 120_000,
  expect: {
    /* Timeout for each assertion. If a particular interaction is timing out, adjust its specific timeout value rather than this global setting */
    timeout: 5000,
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
      name: "chromeSetup",
      use: {
        chromiumChannel: "chrome",
      },
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "edgeSetup",
      use: {
        chromiumChannel: "msedge",
      },
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chrome",
      use: {
        chromiumChannel: "chrome",
      },
      dependencies: isAuthSetupDone("chrome") ? [] : ["chromeSetup"],
    },
    {
      name: "edge",
      use: {
        chromiumChannel: "msedge",
      },
      dependencies: isAuthSetupDone("msedge") ? [] : ["edgeSetup"],
    },
  ],
});
