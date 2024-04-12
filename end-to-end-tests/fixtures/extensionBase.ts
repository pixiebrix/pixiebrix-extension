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

import { test as base, type BrowserContext } from "@playwright/test";
import path from "node:path";
import fs from "node:fs/promises";
import {
  getAuthProfilePathFile,
  getExtensionId,
  launchPersistentContextWithExtension,
} from "./utils";
import { ModsPage } from "../pageObjects/extensionConsole/modsPage";

// This environment variable is used to attach the browser sidepanel window that opens automatically to Playwright.
// See https://github.com/microsoft/playwright/issues/26693
process.env.PW_CHROMIUM_ATTACH_TO_OTHER = "1";
// This environment variable is used to enable an experimental Playwright feature for mocking requests made by
// service workers.
// See https://playwright.dev/docs/service-workers-experimental
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
  chromiumChannel: "chrome" | "msedge";
}>({
  chromiumChannel: ["chrome", { option: true }],
  async context({ chromiumChannel }, use) {
    let authSetupProfileDirectory: string;

    try {
      authSetupProfileDirectory = await fs.readFile(
        getAuthProfilePathFile(chromiumChannel),
        "utf8",
      );
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        console.log(
          "No auth setup profile found. Make sure that the `auth.setup` project has been run first to create the " +
            "profile. (If using UI mode, make sure that the chromeSetup and/or the edgeSetup projects are not filtered out)",
        );
      }

      throw error;
    }

    const temporaryProfileDirectory = await fs.mkdtemp(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion,@typescript-eslint/no-non-null-assertion -- checked above
      path.join(path.dirname(authSetupProfileDirectory!), "e2e-test-"),
    );
    // Copy the auth setup profile to a new temp directory to avoid modifying the original auth profile
    await fs.cp(authSetupProfileDirectory, temporaryProfileDirectory, {
      recursive: true,
    });

    const context = await launchPersistentContextWithExtension(
      chromiumChannel,
      temporaryProfileDirectory,
    );

    await use(context);
    await context.close();
  },
  async page({ context, extensionId }, use) {
    // Re-use the initial context page if it exists
    const page = context.pages()[0] || (await context.newPage());

    // Start off test from the extension console, and ensure it is done loading
    const modsPage = new ModsPage(page, extensionId);
    await modsPage.goto();

    await use(page);
    // The page is closed by the context fixture `.close` cleanup step
  },
  async extensionId({ context }, use) {
    const extensionId = await getExtensionId(context);
    await use(extensionId);
  },
});
export const { expect } = test;
