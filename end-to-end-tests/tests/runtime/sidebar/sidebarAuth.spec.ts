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

import { test, expect } from "../../../fixtures/testBase";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { type Page, test as base } from "@playwright/test";
import { getBaseExtensionConsoleUrl } from "../../../pageObjects/constants";
import { ActivateModPage } from "../../../pageObjects/extensionConsole/modsPage";
import { getSidebarPage, runModViaQuickBar } from "../../../utils";

test("Connect action in partner auth sidebar takes user to the Extension Console", async ({
  page,
  extensionId,
}) => {
  const modId = "@e2e-testing/open-sidebar-via-quickbar";
  const modActivationPage = new ActivateModPage(page, extensionId, modId);
  await modActivationPage.goto();
  await modActivationPage.clickActivateAndWaitForModsPageRedirect();

  await page.goto(`${getBaseExtensionConsoleUrl(extensionId)}#/settings`);
  await expect(
    page.getByRole("heading", { name: "Extension Settings" }),
  ).toBeVisible();

  await page.fill('input[id="partnerId"]', "automation-anywhere");
  await page.fill('input[id="authMethod"]', "partner-oauth2");

  // Trigger onBlur event to persist the new settings
  await page.getByText("Advanced Settings").click();

  await page.goto("/");
  await runModViaQuickBar(page, "Open Sidebar");
  const sidebarPage = await getSidebarPage(page, extensionId);
  await expect(
    sidebarPage.getByText("Connect your Automation Co-Pilot account"),
  ).toBeVisible();
  await sidebarPage.getByRole("link", { name: "Connect Account" }).click();

  const extensionConsolePage = page
    .context()
    .pages()
    .find((p) => p.url().includes(getBaseExtensionConsoleUrl(extensionId)));

  await expect(
    extensionConsolePage.getByText("Set up your account"),
  ).toBeVisible();
});
