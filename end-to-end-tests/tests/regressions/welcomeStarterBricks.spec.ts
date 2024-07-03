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
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { test as base } from "@playwright/test";
import { ActivateModPage } from "../../pageObjects/extensionConsole/modsPage";
import { getSidebarPage, runModViaQuickBar } from "../../utils";

test("#8740: can view the starter mods on the pixiebrix.com/welcome page", async ({
  page,
  extensionId,
}) => {
  const modId = "@e2e-testing/test-sidebar-navigation";
  const modActivationPage = new ActivateModPage(page, extensionId, modId);
  await modActivationPage.goto();
  await modActivationPage.clickActivateAndWaitForModsPageRedirect();

  await page.goto("https://pixiebrix.com/welcome");
  await runModViaQuickBar(page, "Open Sidebar");

  const sideBarPage = await getSidebarPage(page, extensionId);
  await expect(
    sideBarPage.getByRole("heading", { name: "Announcements" }),
  ).toBeVisible({ timeout: 8000 });
  await expect(
    sideBarPage.getByRole("heading", { name: "Decision Tree" }),
  ).toBeVisible();
  await expect(
    sideBarPage.getByRole("heading", { name: "Search" }),
  ).toBeVisible();
  await expect(
    sideBarPage.getByRole("heading", { name: "Snippet Manager" }),
  ).toBeVisible();
  await expect(
    sideBarPage.getByRole("heading", { name: "Writing Assist" }),
  ).toBeVisible();
});
