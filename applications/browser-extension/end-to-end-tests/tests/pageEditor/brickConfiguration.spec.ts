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
test("brick configuration", async ({
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

  await test.step("Activate mods, and initialize page editor, and select the mod starter brick", async () => {
    const modActivationPage = new ActivateModPage(page, extensionId, modId);
    await modActivationPage.goto();
    await modActivationPage.clickActivateAndWaitForModsPageRedirect();

    await page.goto("/");
    pageEditorPage = await newPageEditorPage(page.url());

    brickConfigurationPanel = pageEditorPage.brickConfigurationPanel;

    modListItem = pageEditorPage.modListingPanel.getModListItemByName(
      "Test mod - Brick Configuration",
    );
    await modListItem.select();

    const testStarterBrick = pageEditorPage.modListingPanel.getModStarterBrick(
      "Test mod - Brick Configuration",
      "Context menu item",
    );
    await testStarterBrick.select();
  });

  await test.step("Modify the mod component name, title and menu context", async () => {
    await brickConfigurationPanel.fillField("Name", "A cool menu action");

    await expect(modListItem.saveButton).toBeEnabled();

    await brickConfigurationPanel.fillField("Title", "Do cool stuff with ");
    await brickConfigurationPanel.clickShortcut("Title", "selected text");

    await brickConfigurationPanel.chooseMultiselectOption("Menu Context", [
      "editable",
    ]);
  });

  await test.step("Modify sites patterns", async () => {
    await brickConfigurationPanel.clickShortcut("Sites", "Site");
    await brickConfigurationPanel.clickShortcut("Sites", "Domain");
    await brickConfigurationPanel.clickShortcut("Sites", "HTTPS");
    await brickConfigurationPanel.clickShortcut("Sites", "All URLs");

    await brickConfigurationPanel
      .getByRole("button", { name: "Add Site" })
      .click();

    // TODO: better locators / pom helpers for filling one input of a multi input field.
    await brickConfigurationPanel
      .locator(
        String.raw`[id="starterBrick\.definition\.documentUrlPatterns\.5"]`,
      )
      .fill("https://somePattern.com");
    await brickConfigurationPanel.waitForModFormStateToUpdate();

    // TODO: better locators / pom helpers for modifying the input type.
    await brickConfigurationPanel
      .getByTestId("toggle-starterBrick.definition.documentUrlPatterns.0")
      .getByRole("button")
      .click();
    await brickConfigurationPanel
      .getByTestId("toggle-starterBrick.definition.documentUrlPatterns.0")
      .getByTestId("omit")
      .click();
    await brickConfigurationPanel.waitForModFormStateToUpdate();
  });

  await test.step("Modify advanced settings", async () => {
    await brickConfigurationPanel
      .getByRole("button", { name: "Advanced", exact: true })
      .click();

    await brickConfigurationPanel.chooseSelectOption("Target Mode", "document");

    await brickConfigurationPanel.toggleSwitch("Show Success Message");

    await brickConfigurationPanel
      .getByRole("button", { name: "Advanced: Extra Permissions" })
      .click();

    await brickConfigurationPanel.clickShortcut("Sites/APIs", "All URLs");
  });

  await modListItem!.select();
  await pageEditorPage!.saveActiveMod();

  await verifyModDefinitionSnapshot({
    modId,
    snapshotName: "starter-brick-configuration-changes",
  });

  // NEXT: test modifying the different types of input fields in other bricks (KV, variable, etc.) including the JS code editor
});
