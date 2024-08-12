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

import { type BrowserContext, chromium } from "@playwright/test";
import { CI, PWDEBUG, SLOWMO } from "../env";
import path from "node:path";

export const launchPersistentContextWithExtension = async (
  chromiumChannel: "chrome" | "msedge",
  profileDirectory: string,
) => {
  const pathToExtension = path.join(__dirname, "../../dist");
  return chromium.launchPersistentContext(profileDirectory, {
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
    permissions: ["clipboard-read", "clipboard-write", "accessibility-events"],
  });
};

export const getExtensionId = async (context: BrowserContext) => {
  const background =
    context.serviceWorkers()[0] ||
    (await context.waitForEvent("serviceworker", {
      timeout: 3000,
    }));

  const extensionId = background.url().split("/")[2];

  if (!extensionId) {
    throw new Error(
      "Could not find extensionId during test setup. Did the extension load correctly?",
    );
  }

  return extensionId;
};

export const getAuthProfilePathFile = (
  profileName: string,
  chromiumChannel: "chrome" | "msedge",
) =>
  path.join(
    __dirname,
    `../.auth/${profileName}-${chromiumChannel}-profile-path`,
  );
