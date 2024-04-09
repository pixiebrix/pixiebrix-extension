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

import { test as base, type BrowserContext, type Page } from "@playwright/test";
import { REQUIRE_OPTIONAL_PERMISSIONS_IN_MANIFEST } from "../env";
import {
  getAuthProfilePathFile,
  launchPersistentContextForExtension,
} from "./utils";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import * as os from "node:os";

export const test = base.extend<{
  contextAndPage: { context: BrowserContext; page: Page };
  chromiumChannel: "chrome" | "msedge";
}>({
  chromiumChannel: ["chrome", { option: true }],
  // Provides the context and the initial page together in the same fixture
  async contextAndPage({ chromiumChannel }, use, testInfo) {
    if (!REQUIRE_OPTIONAL_PERMISSIONS_IN_MANIFEST) {
      throw new Error(
        "This test requires optional permissions to be required in the manifest. Please set REQUIRE_OPTIONAL_PERMISSIONS_IN_MANIFEST=1 in your `.env.development` and rerun the extension build.",
      );
    }

    // Create a temp directory to store the test profile
    const authSetupProfileDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "authSetup-"),
    );

    // Create a local auth directory to store the profile paths
    const authPath = path.join(__dirname, "../.auth");
    if (!fsSync.existsSync(authPath)) {
      await fs.mkdir(authPath);
    }

    const context = await launchPersistentContextForExtension(
      chromiumChannel,
      authSetupProfileDirectory,
    );

    // The admin console automatically opens a new tab to log in and link the newly installed extension to the user's account.
    const page = await context.waitForEvent("page", { timeout: 10_000 });

    await use({ context, page });

    // Store the profile path for future use if the auth setup test passes
    if (testInfo.status === "passed") {
      const authProfilePathFile = getAuthProfilePathFile(chromiumChannel);
      await fs.writeFile(
        authProfilePathFile,
        authSetupProfileDirectory,
        "utf8",
      );
    }

    await context.close();
  },
});
