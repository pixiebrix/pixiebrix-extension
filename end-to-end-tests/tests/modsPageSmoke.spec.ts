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

import { test, expect } from "../fixtures/extensionBase";
import { ModsPage } from "../pageObjects/modsPage";
import AxeBuilder from "@axe-core/playwright";
import { checkForCriticalViolations } from "../utils";

test.describe("extension console mods page smoke test", () => {
  test("can view available mods", async ({ page }) => {
    const modsPage = new ModsPage(page, "mpjjildhmpddojocokjkgmlkkkfjnepo");
    await modsPage.goto();
    const pageTitle = await page.title();
    expect(pageTitle).toBe("Mods | PixieBrix");
    await modsPage.viewAllMods();
    const modTableItems = modsPage.modTableItems();
    // There is at least one mod visible
    await expect(modTableItems.nth(0)).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    // TODO: fix these accessibility issues
    //   https://github.com/pixiebrix/pixiebrix-extension/issues/7900
    checkForCriticalViolations(accessibilityScanResults, [
      "color-contrast",
      "heading-order",
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
