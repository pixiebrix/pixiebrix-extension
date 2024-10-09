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
import { type Page, test as base } from "@playwright/test";
import { runModViaQuickBar, getSidebarPage, isSidebarOpen } from "../../utils";

test.describe("sidebar effect bricks", () => {
  test("toggle sidebar brick", async ({ page, extensionId }) => {
    const modId = "@pixies/test/toggle-sidebar";

    const modActivationPage = new ActivateModPage(page, extensionId, modId);
    await modActivationPage.goto();
    await modActivationPage.clickActivateAndWaitForModsPageRedirect();

    await page.goto("/");

    // Ensure the page is focused by clicking on an element before running the keyboard shortcut, see runModViaQuickbar
    await runModViaQuickBar(page, "Toggle Sidebar");

    // Will error if page/frame not available
    const sidebarPage = await getSidebarPage(page, extensionId);

    await expect(
      sidebarPage.getByRole("tab", { name: "Mods Close" }),
    ).toBeVisible();

    await page.getByText("Index of  /").click();
    await runModViaQuickBar(page, "Toggle Sidebar");

    await expect(() => {
      expect(isSidebarOpen(page, extensionId)).toBe(false);
    }).toPass({ timeout: 20_000 });
  });
});
