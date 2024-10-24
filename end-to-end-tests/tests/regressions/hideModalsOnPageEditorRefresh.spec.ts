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
import { ActivateModPage } from "../../pageObjects/extensionConsole/modsPage";
import type { PageEditorPage } from "../../pageObjects/pageEditor/pageEditorPage";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { test as base } from "@playwright/test";

test("should hide add brick modal when Page Editor refreshes", async ({
  page,
  newPageEditorPage,
  extensionId,
}) => {
  let pageEditorPage: PageEditorPage;

  await test.step("Activate mod, and initialize page editor", async () => {
    const modId = "@e2e-testing/simple-sidebar-panel";
    const modActivationPage = new ActivateModPage(page, extensionId, modId);
    await modActivationPage.goto();
    await modActivationPage.clickActivateAndWaitForModsPageRedirect();
    await page.goto("/");
    pageEditorPage = await newPageEditorPage(page.url());
  });

  const addBrickModalTitle = pageEditorPage!.getByText("Add Brick", {
    exact: true,
  });

  await test.step("Select the mod's starter brick in the Page Editor", async () => {
    const modListItem = pageEditorPage.modListingPanel.getModListItemByName(
      "Simple Sidebar Panel",
    );
    await modListItem.select();
    const testStarterBrick = pageEditorPage.modListingPanel.getModStarterBrick(
      "Simple Sidebar Panel",
      "Simple Sidebar Panel",
    );
    await testStarterBrick.select();
  });

  const { brickActionsPanel } = pageEditorPage!;
  await test.step("Open the add brick modal", async () => {
    await brickActionsPanel.getAddBrickButton(0).click();
    await expect(addBrickModalTitle).toBeVisible();
  });

  await test.step("Activate another mod to trigger a Page Editor refresh", async () => {
    const modId = "@e2e-testing/show-alert";
    const newPage = await page.context().newPage();
    const modActivationPage = new ActivateModPage(newPage, extensionId, modId);
    await modActivationPage.goto();
    await modActivationPage.clickActivateAndWaitForModsPageRedirect();
  });

  await test.step("Verify the add brick modal is hidden after the Page Editor refreshes", async () => {
    await expect(addBrickModalTitle).toBeHidden();
    await expect(
      pageEditorPage.getByText(
        "There were changes made in a different instance of the Page Editor. Reload this Page Editor to sync the changes.",
      ),
    ).toBeVisible();
  });
});
