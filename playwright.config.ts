import { defineConfig } from "@playwright/test";
import { CI, E2E_CHROMIUM_CHANNELS } from "./end-to-end-tests/env";
import { type ValueOf } from "type-fest";

export const SupportedChannels: Record<
  string,
  "chrome" | "msedge" | "chrome-beta" | "msedge-beta" | "chromium"
> = {
  CHROME: "chrome",
  MSEDGE: "msedge",
  CHROME_BETA: "chrome-beta",
  MSEDGE_BETA: "msedge-beta",
  CHROMIUM: "chromium",
};

export type SupportedChannel = ValueOf<typeof SupportedChannels>;

const DEFAULT_CHANNELS: SupportedChannel[] = [
  SupportedChannels.CHROME,
  SupportedChannels.MSEDGE,
] as SupportedChannel[];

const getChromiumChannelsFromEnv = (): SupportedChannel[] => {
  if (!E2E_CHROMIUM_CHANNELS) {
    return DEFAULT_CHANNELS;
  }

  let parsedChannels: unknown;
  try {
    parsedChannels = JSON.parse(E2E_CHROMIUM_CHANNELS);
  } catch (error) {
    throw new Error(
      "Failed to parse E2E_CHROMIUM_CHANNELS; expected a json serialized array of strings.",
      { cause: error },
    );
  }

  if (!Array.isArray(parsedChannels)) {
    throw new TypeError(
      "E2E_CHROMIUM_CHANNELS must be an json serialized array of strings",
    );
  }

  return parsedChannels.map((parsedChannel) => {
    if (typeof parsedChannel !== "string") {
      throw new TypeError(
        "E2E_CHROMIUM_CHANNELS must contain only string values",
      );
    }

    if (!Object.values(SupportedChannels).includes(parsedChannel)) {
      throw new Error(`Unsupported channel: ${parsedChannel}`);
    }

    return parsedChannel as SupportedChannel;
  });
};

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig<{ chromiumChannel: string }>({
  testDir: "./end-to-end-tests",
  outputDir: "./end-to-end-tests/.output",
  snapshotPathTemplate:
    "{testDir}/{testFilePath}-snapshots/{testName}/{arg}{ext}",
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: Boolean(CI),
  /* Retry on CI only to catch flakiness */
  retries: CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: CI ? 1 : 2,
  /* Timeout for each test, if a test should take longer than this, use `test.slow()` */
  timeout: 60_000,
  /* Timeout for the entire test run */
  globalTimeout: 30 * 60 * 1000, // 30 minutes
  expect: {
    /* Timeout for each assertion. If a particular interaction is timing out, adjust its specific timeout value rather than this global setting */
    timeout: 5000,
  },
  reportSlowTests: null,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ["blob", { outputDir: "./end-to-end-tests/.blob-report" }],
    ["html", { outputFolder: "./end-to-end-tests/.report" }],
    ["json", { outputFile: "./end-to-end-tests/.report/report.json" }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "https://pbx.vercel.app",

    /* Collect trace when retrying the failed test in CI, and always on failure when running locally. See https://playwright.dev/docs/trace-viewer */
    trace: CI ? "on-first-retry" : "retain-on-failure",

    /* Set the default timeout for actions such as `click` */
    actionTimeout: 5000,

    /* Set the default timeout for page navigations */
    navigationTimeout: 10_000,
  },
  /* Configure projects for major browsers */
  projects: getChromiumChannelsFromEnv().flatMap((chromiumChannel) => [
    {
      name: `${chromiumChannel}-setup`,
      use:
        chromiumChannel === SupportedChannels.CHROMIUM
          ? {}
          : { chromiumChannel },
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: chromiumChannel,
      use:
        chromiumChannel === SupportedChannels.CHROMIUM
          ? {}
          : { chromiumChannel },
      // For faster local development, you can filter out the setup project in --ui mode to skip rerunning the setup project
      dependencies: [`${chromiumChannel}-setup`],
    },
  ]),
});
