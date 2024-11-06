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

test("add/save mod variable definition", async ({
  page,
  verifyModDefinitionSnapshot,
  newPageEditorPage,
}) => {
  await page.goto("/");
  const pageEditorPage = await newPageEditorPage(page.url());

  await pageEditorPage.modListingPanel.addNewMod({
    starterBrickName: "Trigger",
  });

  const { brickActionsPanel, brickConfigurationPanel } = pageEditorPage;

  await test.step("Add a new brick", async () => {
    await brickActionsPanel.addBrick("Assign Mod Variable", { index: 0 });

    await brickConfigurationPanel.fillField("Variable Name", "foobar");
  });

  await test.step("Navigate to Mod Variables Pane", async () => {
    const modListItem =
      pageEditorPage.modListingPanel.getModListItemByName("New Mod");

    await modListItem.click();

    await pageEditorPage.modEditorPane.modVariablesTab.click();
  });

  await test.step("Declare Mod Variable", async () => {
    const { modVariablesTabPanel } = pageEditorPage.modEditorPane;

    expect(
      modVariablesTabPanel.getByRole("cell", { name: "foobar" }),
    ).not.toBeNull();

    await modVariablesTabPanel
      .getByRole("button", { name: "Declare mod variable" })
      .click();
  });

  const { modId } = await pageEditorPage.saveNewMod({
    currentModName: "New Mod",
    selectModListItem: false,
    descriptionOverride: "Created by playwright for declaring mod variables",
  });

  await verifyModDefinitionSnapshot({
    modId,
    snapshotName: "mod-variables-definition",
    mode: "current",
  });
});

test("new mod variable without brick", async ({
  page,
  verifyModDefinitionSnapshot,
  newPageEditorPage,
}) => {
  await page.goto("/");
  const pageEditorPage = await newPageEditorPage(page.url());

  await pageEditorPage.modListingPanel.addNewMod({
    starterBrickName: "Trigger",
  });

  await test.step("Navigate to Mod Variables Pane", async () => {
    const modListItem =
      pageEditorPage.modListingPanel.getModListItemByName("New Mod");

    await modListItem.click();

    await pageEditorPage.modEditorPane.modVariablesTab.click();
  });

  await test.step("Declare Mod Variable", async () => {
    const { modVariablesTabPanel } = pageEditorPage.modEditorPane;

    await modVariablesTabPanel.addVariableButton.click();

    expect(
      modVariablesTabPanel.getByRole("cell", { name: "newVar" }),
    ).not.toBeNull();

    // TODO: improve a11y for mod variables definition table
    await modVariablesTabPanel
      .locator('input[name="variables.0.name"]')
      .fill("customVar");

    await modVariablesTabPanel
      .getByPlaceholder("Enter variable documentation")
      .fill("Playwright description");
  });

  const { modId } = await pageEditorPage.saveNewMod({
    currentModName: "New Mod",
    selectModListItem: false,
    descriptionOverride: "Created by playwright for declaring mod variables",
  });

  await verifyModDefinitionSnapshot({
    modId,
    snapshotName: "mod-variables-definition-no-brick",
    mode: "current",
  });
});
