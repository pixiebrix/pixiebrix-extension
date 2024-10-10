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
import { FloatingActionButton } from "../../pageObjects/floatingActionButton";
import { getSidebarPage, isSidebarOpen } from "../../utils";
import { DEFAULT_TIMEOUT } from "../../../playwright.config";

test.describe("sidebar page smoke test", () => {
  test("can toggle the sidebar from the floating action button and view the related mod's sidebar panel", async ({
    page,
    extensionId,
  }) => {
    const modId = "@e2e-testing/simple-sidebar-panel";

    const modActivationPage = new ActivateModPage(page, extensionId, modId);
    await modActivationPage.goto();
    await modActivationPage.clickActivateAndWaitForModsPageRedirect();

    await page.goto("/bootstrap-5");

    const floatingActionButton = new FloatingActionButton(page);
    await floatingActionButton.toggleSidebar();

    const sideBarPage = await getSidebarPage(page, extensionId);
    await expect(
      sideBarPage.getByRole("heading", { name: "Simple Sidebar Panel" }),
    ).toBeVisible();

    await floatingActionButton.toggleSidebar();

    await expect(() => {
      expect(isSidebarOpen(page, extensionId)).toBe(false);
    }).toPass({ timeout: DEFAULT_TIMEOUT });
  });

  test("can hide the floating action button", async ({ page, extensionId }) => {
    await page.goto("/bootstrap-5");

    const floatingActionButton = new FloatingActionButton(page);
    const actionButton = await floatingActionButton.getActionButton();
    await expect(actionButton).toBeVisible();

    await floatingActionButton.hideFloatingActionButton();

    await expect(actionButton).toBeHidden();

    await page.reload();

    // eslint-disable-next-line playwright/no-wait-for-timeout -- Give the page time to mount the floating action button if it's going to
    await page.waitForTimeout(1000);

    await expect(actionButton).toBeHidden();
  });
});
