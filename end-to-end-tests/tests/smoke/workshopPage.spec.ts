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
import { WorkshopPage } from "../../pageObjects/extensionConsole/workshop/workshopPage";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { test as base } from "@playwright/test";

test.describe("extension console workshop smoke test", () => {
  test("can navigate to workshop page without a username", async ({
    page,
    extensionId,
  }) => {
    const workshopPage = new WorkshopPage(page, extensionId);
    await workshopPage.goto();

    const pageTitle = await page.title();
    expect(pageTitle).toBe("Workshop | PixieBrix");

    // Pass `exact` because "packages" appears in page description
    await expect(page.getByText("Packages", { exact: true })).toBeVisible();
    const workshopListItems = page.getByRole("table").locator("tr");

    // Expect at least one workshop item visible in the list
    await expect(workshopListItems.nth(0)).toBeVisible();
  });
});
