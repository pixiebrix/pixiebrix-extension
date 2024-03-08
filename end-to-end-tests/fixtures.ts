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
  chromium,
  type BrowserContext,
  type Cookie,
} from "@playwright/test";
import path from "node:path";
import { MV } from "./env";
import fs from "node:fs/promises";

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  // eslint-disable-next-line no-empty-pattern -- Playwright requires destructuring pattern as first argument
  async context({}, use) {
    // eslint-disable-next-line unicorn/prefer-module -- TODO: import.meta.dirname is throwing "cannot use 'import meta' outside a module"
    const pathToExtension = path.join(__dirname, "../dist");
    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });

    const fileBuffer = await fs.readFile(
      // eslint-disable-next-line unicorn/prefer-module -- TODO: import.meta.dirname is throwing "cannot use 'import meta' outside a module"
      path.join(__dirname, "./.auth/user.json"),
    );

    const { cookies } = JSON.parse(fileBuffer.toString()) as unknown as {
      cookies: Cookie[];
    };

    // Manually add session cookies instead of relying on storageState in playwright.config.ts because
    // launchPersistentContext does not support a storageState option
    await context.addCookies(cookies);
    await use(context);
    await context.close();
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
