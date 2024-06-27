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
import { ModsPage } from "../../pageObjects/extensionConsole/modsPage";
import AxeBuilder from "@axe-core/playwright";
import { checkForCriticalViolations, ensureVisibility } from "../../utils";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { test as base } from "@playwright/test";

test.describe("extension console mods page smoke test", () => {
  test("can view available mods", async ({ page, extensionId }) => {
    const modsPage = new ModsPage(page, extensionId);
    await modsPage.goto();
    const pageTitle = await page.title();
    expect(pageTitle).toBe("Mods | PixieBrix");
    await modsPage.viewAllMods();
    const modTableItems = modsPage.modTableItems();
    // Expect at least one mod visible - These might be initially hidden, so toBeVisible() would immediately fail
    await ensureVisibility(modTableItems.nth(0), { timeout: 6000 });

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    // TODO: fix these accessibility issues
    //   https://github.com/pixiebrix/pixiebrix-extension/issues/7900
    checkForCriticalViolations(accessibilityScanResults, [
      "color-contrast",
      "label-title-only",
      "landmark-one-main",
      "landmark-unique",
      "link-in-text-block",
      "list",
      "page-has-heading-one",
      "region",
    ]);
  });
});
