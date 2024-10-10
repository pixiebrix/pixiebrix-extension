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

test.only("create, run, package, and update mod", async ({
  page,
  extensionId,
  newPageEditorPage,
  context,
}) => {
  await page.goto("/create-react-app/table");
  const pageEditorPage = await newPageEditorPage(page.url());

  await pageEditorPage.modListingPanel.addNewMod({
    starterBrickName: "Button",
  });

  await pageEditorPage.selectConnectedPageElement(
    page.getByRole("button", { name: "Action #3" }),
  );

  await test.step("Configure the Button brick", async () => {
    await pageEditorPage.brickConfigurationPanel.fillField(
      "Button text",
      "Search Youtube",
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

  const newModName = "Lifecycle Test";
  const modListItem =
    pageEditorPage.modListingPanel.getModListItemByName("New Mod");
  await modListItem.select();
  await pageEditorPage.modEditorPane.editMetadataTabPanel.fillField(
    "name",
    newModName,
  );
  const { modId } = await pageEditorPage.saveNewMod({
    currentModName: newModName,
    descriptionOverride: "Created through Playwright Automation",
  });

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
      "description: Created through Playwright Automation",
      "description: Created and updated with Playwright Automation",
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
      "Created and updated with Playwright Automation",
    );
  });

  await test.step("Delete the mod in the Workshop", async () => {
    const workshopPage = new WorkshopPage(newPage!, extensionId);
    await workshopPage.goto();
    await workshopPage.deleteModByModId(modId);

    const modsPage = new ModsPage(newPage!, extensionId);
    await modsPage.goto();

    await modsPage.viewActiveMods();
    const modTableItem = modsPage.modTableItemById(modId);
    await expect(modTableItem.getByText("Active")).toBeVisible();
    await expect(modTableItem.getByText("No longer Available")).toBeVisible();

    await modTableItem.clickAction("Deactivate");
    await expect(modTableItem.root).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Search Youtube" }),
    ).toBeHidden();
  });
});
