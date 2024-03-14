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
import { E2E_TEST_USER_EMAIL_UNAFFILIATED, MV, SERVICE_URL } from "../env";
import fs from "node:fs/promises";

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
  await page.goto(SERVICE_URL);
  await baseExpect(
    page.getByText(E2E_TEST_USER_EMAIL_UNAFFILIATED),
  ).toBeVisible();
  await baseExpect(async () => {
    await baseExpect(
      page.getByText(
        "Successfully linked the Browser Extension to your PixieBrix account",
      ),
    ).toBeVisible();
  }).toPass({ timeout: 5000 });
};

const ensureExtensionIsLoaded = async (page: Page, extensionId: string) => {
  await baseExpect(async () => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await baseExpect(page.getByText("Extension Console")).toBeVisible();
    await baseExpect(
      page.getByText(E2E_TEST_USER_EMAIL_UNAFFILIATED),
    ).toBeVisible();
  }).toPass({
    timeout: 10_000,
  });
};

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
  storageState: string;
}>({
  // eslint-disable-next-line no-empty-pattern -- Playwright requires destructuring pattern as first argument
  async context({}, use) {
    // eslint-disable-next-line unicorn/prefer-module -- TODO: import.meta.dirname throws "cannot use 'import meta' outside a module"
    const pathToExtension = path.join(__dirname, "../../dist");

    const context = await chromium.launchPersistentContext("", {
      // Test against the branded Chrome browser
      // See: https://playwright.dev/docs/browsers#google-chrome--microsoft-edge
      channel: "chrome",
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });

    // Manually add session cookies instead of relying on storageState in playwright.config.ts because
    // launchPersistentContext does not support a storageState option
    // see https://github.com/microsoft/playwright/issues/7634
    await context.addCookies(await getStoredCookies());
    await use(context);
    await context.close();
  },
  async page({ context, extensionId }, use) {
    const page = await context.newPage();
    // Link the Browser Extension to the user's account via the admin console.
    // TODO: figure out a way to save the linked extension state into chrome
    //  storage so we don't have to load the admin page for every test.
    //  https://github.com/pixiebrix/pixiebrix-extension/issues/7898
    await linkExtensionViaAdminConsole(page);

    // After linking, the Extension will reload, causing errors if the Extension Console is accessed too soon.
    // Wait for the Extension Console to be available before proceeding.
    await ensureExtensionIsLoaded(page, extensionId);

    await use(page);
  },
  async extensionId({ context }, use) {
    let background;

    if (MV === "3") {
      background = context.serviceWorkers()[0];
      background = await context.waitForEvent("serviceworker");
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

    await use(extensionId);
  },
});
export const { expect } = test;
