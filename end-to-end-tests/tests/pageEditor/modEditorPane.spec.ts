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

const testModDefinitionName = "simple-sidebar-panel";
test.use({ modDefinitionNames: [testModDefinitionName] });
test("mod editor pane behavior", async ({
  page,
  extensionId,
  modDefinitionsMap,
  newPageEditorPage,
  verifyModDefinitionSnapshot,
}) => {
  const { id: modId } = modDefinitionsMap[testModDefinitionName]!;
  let pageEditorPage: PageEditorPage;

  await test.step("Activate mod, and initialize page editor", async () => {
    const modActivationPage = new ActivateModPage(page, extensionId, modId);
    await modActivationPage.goto();
    await modActivationPage.clickActivateAndWaitForModsPageRedirect();

    await page.goto("/");
    pageEditorPage = await newPageEditorPage(page.url());
  });

  const { modEditorPane } = pageEditorPage!;
  await test.step("Select the mod in the page editor and verify mod editor pane is visible", async () => {
    // The mod editor pane should be hidden initially
    await expect(modEditorPane.root).toBeHidden();

    const modListItem = pageEditorPage.modListingPanel.getModListItemByName(
      "Simple Sidebar Panel",
    );
    await modListItem.select();
    await expect(modEditorPane.editMetadataTabPanel.modId).toHaveValue(modId);
  });

  await test.step("Change mod metadata", async () => {
    await modEditorPane.editMetadataTabPanel.fillField(
      "name",
      "Simple Sidebar Panel (Updated)",
    );
    await modEditorPane.editMetadataTabPanel.fillField("version", "1.0.2");
    await modEditorPane.editMetadataTabPanel.fillField(
      "description",
      "Created with the PixieBrix Page Editor (updated)",
    );
    await pageEditorPage.saveActiveMod();
    await verifyModDefinitionSnapshot({
      modId,
      snapshotName: "updated-metadata",
    });
  });

  await test.step("Add and update mod inputs", async () => {
    await modEditorPane.currentInputsTab.click();
    await expect(
      modEditorPane.currentInputsTabPanel.noConfigurationRequiredMessage,
    ).toBeVisible();
    await modEditorPane.inputFormTab.click();
    const { inputFormTabPanel } = modEditorPane;
    await inputFormTabPanel.fillField("Activation Instructions", "Just do it!");
    await inputFormTabPanel.addNewFieldButton.click();
    await inputFormTabPanel.fillField("Name", "testField");
    await inputFormTabPanel.fillField("Label", "test label");
    await inputFormTabPanel.fillField("Field Description", "test description");
    await inputFormTabPanel.fillField("Placeholder", "test placeholder");
    await inputFormTabPanel.fillField("Default Value", "default val");
    await inputFormTabPanel.toggleSwitch("Required Field?");

    await modEditorPane.currentInputsTab.click();
    await expect(
      modEditorPane.currentInputsTabPanel.getByLabel("test label", {
        exact: true,
      }),
    ).toHaveValue("default val");
    await modEditorPane.currentInputsTabPanel.fillField(
      "test label",
      "some real value",
    );
    await pageEditorPage.saveActiveMod();
    await verifyModDefinitionSnapshot({
      modId,
      snapshotName: "updated-inputs",
    });
  });
});
