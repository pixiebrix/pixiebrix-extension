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
  // eslint-disable-next-line no-empty-pattern -- todo: why is this necessary?
  async context({}, use) {
    // eslint-disable-next-line unicorn/prefer-module -- todo: why isn't import.meta not working?
    const pathToExtension = path.join(__dirname, "../dist");
    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });

    const fileBuffer = await fs.readFile(
      // eslint-disable-next-line unicorn/prefer-module -- todo: why isn't import.meta not working?
      path.join(__dirname, "./.auth/user.json"),
    );

    const { cookies } = JSON.parse(fileBuffer.toString()) as unknown as {
      cookies: Cookie[];
    };

    await context.addCookies(cookies);
    await use(context);
    await context.close();
  },
  async extensionId({ context }, use) {
    if (MV === "3") {
      let [background] = context.serviceWorkers();
      background = await context.waitForEvent("serviceworker");

      const extensionId = background.url().split("/")[2];
      await use(extensionId);
    } else {
      // For manifest v2:
      let [background] = context.backgroundPages();
      background ||= await context.waitForEvent("backgroundpage");

      const extensionId = background.url().split("/")[2];
      await use(extensionId);
    }
  },
});
export const { expect } = test;
