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
import { ModComponentListItem } from "../../pageObjects/pageEditor/modListItem";

test("mod actions with unsaved mod", async ({
  page,
  newPageEditorPage,
  verifyModDefinitionSnapshot,
}) => {
  await page.goto("/");
  const pageEditorPage = await newPageEditorPage(page.url());
  const brickPipeline = pageEditorPage.brickActionsPanel.bricks;

  const { modName, modComponentName } =
    await pageEditorPage.addNewModWithButtonStarterBrick(async () => {
      await pageEditorPage.selectConnectedPageElement(
        page.getByRole("link", { name: "navigation" }),
      );
    });
  const modListItem =
    pageEditorPage.modListingPanel.getModListItemByName(modName);
  await modListItem.select();
  await expect(modListItem.dirtyIcon).toBeVisible();

  await test.step("Add trigger starter brick to mod and add bricks", async () => {
    await modListItem.modActionMenu.addStarterBrick("Trigger");
    await pageEditorPage.brickConfigurationPanel.fillField(
      "name",
      "Test Trigger component",
    );
    await pageEditorPage.brickActionsPanel.addBrick("extract from page");
    await pageEditorPage.brickActionsPanel.addBrick("Show Confetti");
    await expect(brickPipeline).toHaveCount(3);
    await expect(brickPipeline.first()).toHaveText("Trigger");
    await expect(brickPipeline.nth(1)).toHaveText("Extract from page");
    await expect(brickPipeline.last()).toHaveText("Show Confetti");
  });

  await test.step("Duplicate trigger component within the mod", async () => {
    const triggerComponent = pageEditorPage.modListingPanel.getModStarterBrick(
      modName,
      "Trigger",
    );
    await triggerComponent.select();
    await triggerComponent.modComponentActionMenu.duplicateOption.click();

    const allStarterBricks =
      pageEditorPage.modListingPanel.getAllModStarterBricks(modName);
    await expect(allStarterBricks).toHaveCount(3);

    const buttonComponent = allStarterBricks.first();
    await expect(buttonComponent).toHaveText(modComponentName);
    const buttonListItem = new ModComponentListItem(buttonComponent);
    await expect(buttonListItem.unavailableIcon).toBeHidden();
    await expect(buttonListItem.dirtyIcon).toBeVisible();

    const firstTriggerComponent = allStarterBricks.nth(1);
    await expect(firstTriggerComponent).toHaveText("Test Trigger component");
    const firstTriggerListItem = new ModComponentListItem(
      firstTriggerComponent,
    );
    await expect(firstTriggerListItem.unavailableIcon).toBeHidden();
    await expect(firstTriggerListItem.dirtyIcon).toBeVisible();

    const secondTriggerComponent = allStarterBricks.last();
    await expect(secondTriggerComponent).toHaveText(
      "Test Trigger component (Copy)",
    );
    const secondTriggerListItem = new ModComponentListItem(
      secondTriggerComponent,
    );
    await expect(secondTriggerListItem.unavailableIcon).toBeHidden();
    await expect(secondTriggerListItem.dirtyIcon).toBeVisible();
  });

  const movedComponentName = "Moved Test Trigger component";
  const movedComponentModName = "Moved Component Test Mod";

  await test.step("Move trigger copy to a new mod", async () => {
    const triggerComponentName = "Test Trigger component (Copy)";
    const triggerComponent = pageEditorPage.modListingPanel.getModStarterBrick(
      modName,
      triggerComponentName,
    );
    await triggerComponent.select();
    await triggerComponent.modComponentActionMenu.click();
    await triggerComponent.modComponentActionMenu.moveFromModOption.click();

    const moveModModal = pageEditorPage.getByRole("dialog");
    await expect(moveModModal).toBeVisible();
    await expect(moveModModal).toHaveText(
      `Move ${triggerComponentName} from mod ${modName}?`,
    );
    await moveModModal
      .getByRole("combobox")
      .selectOption("➕ Create new mod...");
    await moveModModal.getByRole("button", { name: "Move" }).click();

    await pageEditorPage.brickConfigurationPanel.fillField(
      "name",
      movedComponentModName,
    );

    const modListItem =
      pageEditorPage.modListingPanel.getModListItemByName(triggerComponentName);
    await expect(modListItem.dirtyIcon).toBeHidden();
    await expect(modListItem.saveButton).toBeEnabled();
    await pageEditorPage.modEditorPane.editMetadataTabPanel.fillField(
      "name",
      movedComponentName,
    );
  });

  const copiedComponentName = "Copied Test Trigger component";
  const copiedComponentModName = "Copied Component Test Mod";

  await test.step("Copy the component to a third mod", async () => {
    const newModComponentListItem =
      pageEditorPage.modListingPanel.getModStarterBrick(
        movedComponentModName,
        movedComponentName,
      );
    await newModComponentListItem.select();
    await newModComponentListItem.modComponentActionMenu.click();
    await newModComponentListItem.modComponentActionMenu.copyToModOption.click();

    const copyModModal = pageEditorPage.getByRole("dialog");
    await expect(copyModModal).toBeVisible();
    await expect(copyModModal).toHaveText(
      `Copy ${movedComponentName} to another mod?`,
    );
    await copyModModal
      .getByRole("combobox")
      .selectOption("➕ Create new mod...");
    await copyModModal.getByRole("button", { name: "Copy" }).click();

    await pageEditorPage.brickConfigurationPanel.fillField(
      "name",
      copiedComponentModName,
    );

    const modListItem =
      pageEditorPage.modListingPanel.getModListItemByName(copiedComponentName);
    await expect(modListItem.dirtyIcon).toBeHidden();
    await expect(modListItem.saveButton).toBeEnabled();
    await pageEditorPage.modEditorPane.editMetadataTabPanel.fillField(
      "name",
      copiedComponentName,
    );
  });

  await test.step("Add new component to the third mod and move it to the second mod", async () => {});
});
