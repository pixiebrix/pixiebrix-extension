/*
 * Copyright (C) 2024 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import {
  test as base,
  expect as baseExpect,
  chromium,
  type BrowserContext,
  type Cookie,
  type Page,
} from "@playwright/test";
import path from "node:path";
import {
  CI,
  E2E_TEST_USER_EMAIL_UNAFFILIATED,
  MV,
  PWDEBUG,
  REQUIRE_OPTIONAL_PERMISSIONS_IN_MANIFEST,
  SLOWMO,
} from "../env";
import fs from "node:fs/promises";
import { getBaseExtensionConsoleUrl } from "../pageObjects/constants";
import { ensureVisibility } from "../utils";

// This environment variable is used to attach the browser sidepanel window that opens automatically to Playwright.
// see: https://github.com/microsoft/playwright/issues/26693
process.env.PW_CHROMIUM_ATTACH_TO_OTHER = "1";

const getStoredCookies = async (): Promise<Cookie[]> => {
  let fileBuffer;
  try {
    fileBuffer = await fs.readFile(
      // eslint-disable-next-line unicorn/prefer-module -- TODO: import.meta.dirname throws "cannot use 'import meta' outside a module"
      path.join(__dirname, "../.auth/user.json"),
    );
  } catch (error) {
    // If the file does not exist, we are likely running authenticate setup for the first time. Return an empty array.
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  const { cookies } = JSON.parse(fileBuffer.toString()) as unknown as {
    cookies: Cookie[];
  };
  return cookies;
};

const linkExtensionViaAdminConsole = async (page: Page) => {
  await ensureVisibility(
    page.getByText(
      "Successfully linked the Browser Extension to your PixieBrix account",
    ),
    { timeout: 10_000 },
  );
  await baseExpect(
    page.getByText(E2E_TEST_USER_EMAIL_UNAFFILIATED),
  ).toBeVisible();
};

const ensureExtensionIsLoaded = async (page: Page, extensionId: string) => {
  await baseExpect(async () => {
    await page.goto(getBaseExtensionConsoleUrl(extensionId));
    await baseExpect(page.getByText("Extension Console")).toBeVisible();
    await baseExpect(
      page.getByText(E2E_TEST_USER_EMAIL_UNAFFILIATED),
    ).toBeVisible({ timeout: 10_000 });
  }).toPass({
    timeout: 20_000,
  });
};

const getExtensionId = async (context: BrowserContext) => {
  let background;

  if (MV === "3") {
    background = context.serviceWorkers()[0];
    background ||= await context.waitForEvent("serviceworker");
  } else {
    // For manifest v2:
    background = context.backgroundPages()[0];
    background ||= await context.waitForEvent("backgroundpage");
  }

  const extensionId = background.url().split("/")[2];

  if (!extensionId) {
    throw new Error(
      "Could not find extensionId during test setup. Did the extension load correctly?",
    );
  }

  return extensionId;
};

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
  chromiumChannel: "chrome" | "msedge";
}>({
  chromiumChannel: ["chrome", { option: true }],
  async context({ chromiumChannel }, use) {
    if (!REQUIRE_OPTIONAL_PERMISSIONS_IN_MANIFEST) {
      throw new Error(
        "This test requires optional permissions to be required in the manifest. Please set REQUIRE_OPTIONAL_PERMISSIONS_IN_MANIFEST=1 in your `.env.development` and rerun the extension build.",
      );
    }

    // eslint-disable-next-line unicorn/prefer-module -- TODO: import.meta.dirname throws "cannot use 'import meta' outside a module"
    const pathToExtension = path.join(__dirname, "../../dist");

    const context = await chromium.launchPersistentContext("", {
      // Test against the branded Chrome browser
      // See: https://playwright.dev/docs/browsers#google-chrome--microsoft-edge
      channel: chromiumChannel,
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        // Chrome extensions are not supported in the traditional headless mode,
        // but we can use the "new" flag to enable headless mode.
        // This mode is not officially supported by Playwright and might result in unexpected behavior,
        // so only use in local development for now.
        // https://playwright.dev/docs/chrome-extensions#headless-mode
        ...(CI || SLOWMO || PWDEBUG ? [] : ["--headless=new"]),
      ],
      slowMo: SLOWMO ? 3000 : undefined,
      permissions: [
        "clipboard-read",
        "clipboard-write",
        "accessibility-events",
      ],
      // Set the viewport to null because we rely on the real inner window width to detect when the sidepanel is open
      // See: https://github.com/microsoft/playwright/issues/11465 and https://github.com/pixiebrix/pixiebrix-extension/blob/b4b0a2efde2c3ac5e634220b555532a2875fe5da/src/contentScript/sidebarController.tsx#L78
      viewport: null,
    });
    // The admin console automatically opens a new tab to link the newly installed extension to the user's account.
    const pagePromise = context.waitForEvent("page", { timeout: 10_000 });

    // Manually add session cookies instead of relying on storageState in playwright.config.ts because
    // launchPersistentContext does not support a storageState option
    // see https://github.com/microsoft/playwright/issues/7634 and https://github.com/microsoft/playwright/issues/14949
    await context.addCookies(await getStoredCookies());
    const extensionId = await getExtensionId(context);

    // Wait for the admin console to open automatically
    const page = await pagePromise;

    // Link the Browser Extension to the user's account via the admin console.
    // TODO: figure out a way to save the linked extension state into chrome
    //  storage so the admin page doesn't get loaded for every test.
    //  https://github.com/pixiebrix/pixiebrix-extension/issues/7898
    await linkExtensionViaAdminConsole(page);

    // After linking, the Extension will reload, causing errors if the Extension Console is accessed too soon.
    // Wait for the Extension Console to be available before proceeding.
    await ensureExtensionIsLoaded(page, extensionId);
    await use(context);
    await context.close();
  },
  async extensionId({ context }, use) {
    const extensionId = await getExtensionId(context);
    await use(extensionId);
  },
});
export const { expect } = test;
