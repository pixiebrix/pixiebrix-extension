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
  mergeTests,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import {
  getAuthProfilePathFile,
  launchPersistentContextWithExtension,
} from "./utils";
import fs from "node:fs/promises";
import path from "node:path";
import * as os from "node:os";
import { test as envSetup } from "./environmentCheck";
import {
  type SupportedChannel,
  SupportedChannels,
} from "../../playwright.config";

const profileNameFromTestPath = (testFilePath: string) => {
  // Split the file path into directory and file name
  const parts = testFilePath.split("/");
  const fileName = parts.at(-1);

  // Split the file name into words and return the first word
  const words = fileName?.split(".");
  return words?.[0] || "unknown";
};

// Create a local auth directory to store the profile paths
const createAuthProfilePathDirectory = async () => {
  const authPath = path.join(__dirname, "../.auth");
  try {
    await fs.mkdir(authPath);
  } catch (error) {
    if (
      !(error instanceof Error && "code" in error && error.code === "EEXIST")
    ) {
      throw error;
    }
  }
};

export const test = mergeTests(
  envSetup,
  base.extend<{
    contextAndPage: { context: BrowserContext; page: Page };
    chromiumChannel: SupportedChannel;
    additionalRequiredEnvVariables: string[];
  }>({
    chromiumChannel: [SupportedChannels.CHROME, { option: true }],
    additionalRequiredEnvVariables: [
      "REQUIRE_OPTIONAL_PERMISSIONS_IN_MANIFEST",
    ],
    // Provides the context and the initial page together in the same fixture
    async contextAndPage({ chromiumChannel }, use, testInfo) {
      // Create a temp directory to store the test profile
      const authSetupProfileDirectory = await fs.mkdtemp(
        path.join(os.tmpdir(), "authSetup-"),
      );

      // Create a local auth directory to store the profile paths
      await createAuthProfilePathDirectory();

      const context = await launchPersistentContextWithExtension(
        chromiumChannel,
        authSetupProfileDirectory,
      );

      // The admin console automatically opens a new tab to log in and link the newly installed extension to the user's account.
      const page = await context.waitForEvent("page");

      await use({ context, page });

      // Store the profile path for future use if the auth setup test passes
      if (testInfo.status === "passed") {
        const authProfilePathFile = getAuthProfilePathFile(
          profileNameFromTestPath(testInfo.titlePath[0] || "unknown"),
          chromiumChannel,
        );
        await fs.writeFile(
          authProfilePathFile,
          authSetupProfileDirectory,
          "utf8",
        );
      }

      await context.close();
    },
  }),
);
