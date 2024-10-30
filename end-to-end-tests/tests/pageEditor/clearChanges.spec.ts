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
import { type ConfigurationForm } from "../../pageObjects/pageEditor/configurationForm";
import { type ModListItem } from "../../pageObjects/pageEditor/modListingPanel";

const testModDefinitionName = "brick-configuration";
test.use({ modDefinitionNames: [testModDefinitionName] });
test("clear mod component changes", async ({
  page,
  extensionId,
  modDefinitionsMap,
  newPageEditorPage,
  verifyModDefinitionSnapshot,
}) => {
  const { id: modId } = modDefinitionsMap[testModDefinitionName]!;
  let pageEditorPage: PageEditorPage;
  let brickConfigurationPanel: ConfigurationForm;
  let modListItem: ModListItem;

  await test.step("Activate mods, and initialize page editor, and select the mod component", async () => {
    const modActivationPage = new ActivateModPage(page, extensionId, modId);
    await modActivationPage.goto();
    await modActivationPage.clickActivateAndWaitForModsPageRedirect();

    await page.goto("/");
    pageEditorPage = await newPageEditorPage(page);

    brickConfigurationPanel = pageEditorPage.brickConfigurationPanel;

    // Expand the mod
    await pageEditorPage.modListingPanel
      .getModListItemByName("Test mod - Brick Configuration")
      .select();

    // Select the mod component
    modListItem =
      pageEditorPage.modListingPanel.getModListItemByName("Context menu item");
    await modListItem.select();

    // Change icon should not exist
    await expect(modListItem.unsavedChangesIcon).toHaveCount(0);
  });

  await test.step("Modify the mod component name and expect change icon", async () => {
    await brickConfigurationPanel.fillField("Name", "A cool menu action");

    // Reselect the mod component
    modListItem =
      pageEditorPage.modListingPanel.getModListItemByName("A cool menu action");

    await expect(modListItem.unsavedChangesIcon).toBeVisible();
  });

  await test.step("Clear changes and expect the icon to go away", async () => {
    await modListItem.menuButton.click();

    await modListItem.modComponentActionMenu.clearChangesButton.click();

    const dialog = pageEditorPage.getByRole("dialog");
    await dialog.getByRole("button", { name: "Clear Changes" }).click();

    // Reselect the mod component
    modListItem =
      pageEditorPage.modListingPanel.getModListItemByName("Context menu item");

    // Change icon should not exist
    await expect(modListItem.unsavedChangesIcon).toHaveCount(0);
  });
});
