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

import { expect, test } from "../fixtures/testBase";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { type Page, test as base } from "@playwright/test";
import {
  ActivateModPage,
  ModsPage,
} from "../pageObjects/extensionConsole/modsPage";
import { clickAndWaitForNewPage } from "end-to-end-tests/utils";
import { WorkshopPage } from "end-to-end-tests/pageObjects/extensionConsole/workshop/workshopPage";

test("create, run, package, and update mod", async ({
  page,
  extensionId,
  newPageEditorPage,
  context,
}) => {
  await page.goto("/create-react-app/table");
  const pageEditorPage = await newPageEditorPage(page.url());

  const { modComponentName } =
    await pageEditorPage.modListingPanel.addNewModWithStarterBrick("Button");

  await test.step("Configure the Button brick", async () => {
    await pageEditorPage.selectConnectedPageElement(
      page.getByRole("button", { name: "Action #3" }),
    );

    await pageEditorPage.brickConfigurationPanel.fillField(
      "Button text",
      "Search Youtube",
    );
    await pageEditorPage.brickConfigurationPanel.fillField(
      "name",
      modComponentName,
    );
  });

  await test.step("Add the Extract from Page brick and configure it", async () => {
    await pageEditorPage.brickActionsPanel.addBrick("extract from page");

    await pageEditorPage.brickConfigurationPanel.fillFieldByPlaceholder(
      "Property name",
      "searchText",
    );

    // Without focusing first, the click doesn't enable selection tool ¯\_(ツ)_/¯
    await pageEditorPage.brickConfigurationPanel
      .getByLabel("Select element")
      .focus();
    await pageEditorPage.brickConfigurationPanel
      .getByLabel("Select element")
      .click();

    await pageEditorPage.selectConnectedPageElement(
      page.getByRole("heading", { name: "Transaction Table" }),
    );

    await expect(
      pageEditorPage.brickConfigurationPanel.getByPlaceholder(
        "Select an element",
      ),
    ).toHaveValue("#root h1");
  });

  await test.step("Add the YouTube search brick and configure it", async () => {
    await pageEditorPage.brickActionsPanel.addBrick(
      "YouTube search in new tab",
      {
        index: 1,
      },
    );

    await pageEditorPage.brickConfigurationPanel.fillField(
      "Query",
      "{{ @data.searchText }} + Foo",
    );
  });

  await test.step("Edit the mod metadata and save", async () => {
    // Auto-created mod name will be "My <website url> button"
    let modListItem =
      pageEditorPage.modListingPanel.getModListItemByName("button");
    await modListItem.select();

    await expect(
      pageEditorPage.modEditorPane.editMetadataTabPanel.getByText(
        "Save the mod to assign an id",
      ),
    ).toBeVisible();

    await pageEditorPage.modEditorPane.editMetadataTab.click();
    await pageEditorPage.modEditorPane.editMetadataTabPanel.name.fill(
      "Lifecycle Test Mod",
    );
    await pageEditorPage.modEditorPane.editMetadataTabPanel.description.fill(
      "Created through Playwright Automation",
    );

    // Get the updated modListItem with the new name
    modListItem =
      pageEditorPage.modListingPanel.getModListItemByName("Lifecycle Test Mod");
    await modListItem.saveButton.click();

    // Handle the "Save new mod" modal
    const saveNewModModal = pageEditorPage.page.getByRole("dialog");
    await expect(saveNewModModal).toBeVisible();
    await expect(saveNewModModal.getByText("Save new mod")).toBeVisible();

    // Verify the updated title and description in the modal
    const nameInput = saveNewModModal.locator('input[name="name"]');
    const descriptionInput = saveNewModModal.locator(
      'input[name="description"]',
    );

    await expect(nameInput).toHaveValue("Lifecycle Test Mod");
    await expect(descriptionInput).toHaveValue(
      "Created through Playwright Automation",
    );

    // Click the Save button in the modal
    await saveNewModModal.getByRole("button", { name: "Save" }).click();

    // Wait for the save confirmation
    await expect(
      pageEditorPage.page.getByRole("status").filter({ hasText: "Saved mod" }),
    ).toBeVisible();
  });

  const modId =
    await pageEditorPage.modEditorPane.editMetadataTabPanel.modId.inputValue();

  let newPage: Page | undefined;
  await test.step("Run the mod", async () => {
    newPage = await clickAndWaitForNewPage(
      page.getByRole("button", { name: "Search Youtube" }),
      context,
    );
    await expect(newPage).toHaveURL(
      "https://www.youtube.com/results?search_query=Transaction+Table+%2B+Foo",
    );
  });

  await test.step("View and update mod in the Workshop", async () => {
    const workshopPage = new WorkshopPage(newPage!, extensionId);
    await workshopPage.goto();
    const editWorkshopModPage = await workshopPage.findAndSelectMod(modId);
    await editWorkshopModPage.editor.findAndReplaceText(
      "version: 1.0.0",
      "version: 1.0.1",
    );
    await editWorkshopModPage.editor.findAndReplaceText(
      "description: Created with the PixieBrix Page Editor",
      "description: Created through Playwright Automation",
    );
    await editWorkshopModPage.updateBrick();
  });

  await test.step("View the updated mod on the mods page", async () => {
    const modsPage = new ModsPage(newPage!, extensionId);
    await modsPage.goto();

    await modsPage.viewActiveMods();
    const modTableItem = modsPage.modTableItemById(modId);
    await expect(modTableItem.getByText("version 1.0.1")).toBeVisible();
    await modTableItem.clickAction("Reactivate");

    const modActivatePage = new ActivateModPage(newPage!, extensionId, modId);

    await expect(modActivatePage.locator("form")).toContainText(
      "Created through Playwright Automation",
    );
  });
});
