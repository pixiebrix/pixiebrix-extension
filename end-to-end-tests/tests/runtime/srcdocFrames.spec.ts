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

import { test, expect } from "../../fixtures/testBase";
import { ActivateModPage } from "../../pageObjects/extensionConsole/modsPage";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { test as base } from "@playwright/test";
import { range } from "lodash";

test("8143: mods can run in srcdoc iframes", async ({
  page,
  extensionId,
  chromiumChannel,
}) => {
  test.skip(
    chromiumChannel === "chrome",
    "Skip test on Chrome. See: https://pixiebrix.slack.com/archives/C07DGPVQJKH",
  );
  const modId = "@pixies/test/8143-repro";

  const modActivationPage = new ActivateModPage(page, extensionId, modId);
  await modActivationPage.goto();

  await modActivationPage.clickActivateAndWaitForModsPageRedirect();

  await page.goto("/frame-src/");

  const frameLocator = page.frameLocator("iframe");

  await Promise.all(
    range(0, 2).map(async (index) => {
      const frame = frameLocator.nth(index);
      const locator = frame.locator("mark").first();
      await expect(locator).toBeVisible();
    }),
  );
});
