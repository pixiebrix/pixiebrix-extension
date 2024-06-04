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
import { FloatingActionButton } from "../../pageObjects/floatingActionButton";
import { getSidebarPage, isSidebarOpen } from "../../utils";

test.describe("sidebar page smoke test", () => {
  test("can toggle the sidebar from the floating action button and view the related mod's sidebar panel", async ({
    page,
    extensionId,
  }) => {
    const modId = "@pixies/ai/writer-assist";

    const modActivationPage = new ActivateModPage(page, extensionId, modId);
    await modActivationPage.goto();
    // The default integration values are not immediately loaded and are temporarily empty.
    // If we try activating too fast, the activation will fail due to missing configuration, so we wait for the values to load.
    await expect(
      page.getByText("OpenAI — ✨ Built-in", { exact: true }),
    ).toBeVisible();
    await modActivationPage.clickActivateAndWaitForModsPageRedirect();

    await page.goto("/bootstrap-5");

    const floatingActionButton = new FloatingActionButton(page);
    await floatingActionButton.toggleSidebar();

    const sideBarPage = await getSidebarPage(page, extensionId);
    await expect(
      sideBarPage.getByRole("heading", { name: "✍️ Write Assist" }),
    ).toBeVisible();

    await floatingActionButton.toggleSidebar();

    await expect(() => {
      expect(isSidebarOpen(page, extensionId)).toBe(false);
    }).toPass({ timeout: 5000 });
  });

  test("can hide the floating action button", async ({ page, extensionId }) => {
    await page.goto("/bootstrap-5");

    const floatingActionButton = new FloatingActionButton(page);
    const actionButton = await floatingActionButton.getActionButton();
    await expect(actionButton).toBeVisible();

    await floatingActionButton.hideFloatingActionButton();

    await expect(actionButton).toBeHidden();
  });
});
