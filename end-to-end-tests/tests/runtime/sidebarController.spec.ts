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

import { test, expect } from "../../fixtures/extensionBase";
import { ActivateModPage } from "../../pageObjects/extensionConsole/modsPage";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { type Page, test as base } from "@playwright/test";
import { getSidebarPage, isSidebarOpen } from "../../utils";
import { MV } from "../../env";

test.describe("sidebar controller", () => {
  test("show sidebar uses top-level frame", async ({ page, extensionId }) => {
    const modId = "@pixies/test/frame-sidebar-actions";

    const modActivationPage = new ActivateModPage(page, extensionId, modId);
    await modActivationPage.goto();
    await modActivationPage.clickActivateAndWaitForModsPageRedirect();

    await page.goto("/frames-builder.html");

    const frame = page.frameLocator("iframe");
    await frame.getByRole("link", { name: "Show Sidebar Immediately" }).click();

    // Will error if page/frame not available
    const sidebarPage = await getSidebarPage(page, extensionId);

    await expect(
      sidebarPage.getByRole("tab", { name: "Mods Close" }),
    ).toBeVisible();

    await frame.getByRole("link", { name: "Hide Sidebar" }).click();

    await expect(() => {
      expect(isSidebarOpen(page, extensionId)).toBe(false);
    }).toPass({ timeout: 5000 });

    // Mod waits 5 seconds before running Show Sidebar brick to for user gesture dialog to show
    await frame.getByRole("link", { name: "Show Sidebar after Wait" }).click();
    await page.waitForTimeout(5000);

    // Expect the focus dialog to be visible on the top-level frame
    if (MV === "3") {
      // FIXME: why aren't we getting a dialog here when running locally?
      // Should be on the top-level frame
      await expect(page.getByRole("button", { name: "OK" })).toBeVisible();

      // Should not be on the frame. Check after checking the top-level frame because it's a positive check for
      // the dialog being shown.
      await expect(frame.getByRole("button", { name: "OK" })).not.toBeVisible();
    }

    // Will error if page/frame not available
    await getSidebarPage(page, extensionId);
  });
});
