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

import { expect, test } from "../../fixtures/testBase";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { test as base } from "@playwright/test";
import { ActivateModPage } from "../../pageObjects/extensionConsole/modsPage";
import { type PageEditorPage } from "end-to-end-tests/pageObjects/pageEditor/pageEditorPage";
import { getSidebarPage } from "../../utils";

test("mod editor pane behavior", async ({
  page,
  extensionId,
  newPageEditorPage,
}) => {
  const modId = "@e2e-testing/options-args";
  let pageEditorPage: PageEditorPage;

  await test.step("Activate mod, and initialize page editor", async () => {
    const modActivationPage = new ActivateModPage(page, extensionId, modId);
    await modActivationPage.goto();
    await modActivationPage.clickActivateAndWaitForModsPageRedirect();

    await page.goto("/");
    pageEditorPage = await newPageEditorPage(page);
  });

  const { modEditorPane } = pageEditorPage!;
  await test.step("Expand the mod in the listing panel", async () => {
    await pageEditorPage.modListingPanel
      .getModListItemByName("Options Args")
      .select();
  });

  await test.step("Open Sidebar and assert default value", async () => {
    await pageEditorPage.modListingPanel
      .getModListItemByName("Sidebar Panel")
      .select();

    const sideBarPage = await getSidebarPage(page, extensionId);
    await expect(sideBarPage.getByText("Default Value")).toBeVisible();
  });

  await test.step("Update mod inputs and verify sidebar refreshes automatically", async () => {
    await pageEditorPage.modListingPanel
      .getModListItemByName("Options Args")
      .select();

    await modEditorPane.currentInputsTab.click();

    await modEditorPane.currentInputsTabPanel.fillField(
      "Sidebar Message",
      "Hello from Playwright",
    );

    const sidebarPage = await getSidebarPage(page, extensionId);
    await expect(sidebarPage.getByText("Hello from Playwright")).toBeVisible();
  });
});
