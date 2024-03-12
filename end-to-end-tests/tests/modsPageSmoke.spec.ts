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

test.describe("extension console smoke test", () => {
  test("can open the mods page in the extension console and view available mods", async ({
    page,
    extensionId,
  }) => {
    const modsPage = new ModsPage(page, extensionId);
    await modsPage.goto();
    const pageTitle = await page.title();
    expect(pageTitle).toBe("Mods | PixieBrix");
    await modsPage.viewAllMods();
    const modTableItems = await modsPage.getAllModTableItems();
    // There is at least one mod visible
    await expect(modTableItems.nth(0)).toBeVisible();
  });
});
