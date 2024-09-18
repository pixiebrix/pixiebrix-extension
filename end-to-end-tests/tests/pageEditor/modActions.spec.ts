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

test("mod actions with unsaved mod", async ({ page, newPageEditorPage }) => {
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
  await expect(modListItem.dirtyIcon).toBeVisible();
  await modListItem.select();
  await expect(modListItem.dirtyIcon).toBeHidden();

  const triggerComponentName = "Test Trigger component";
  const triggerCopyComponentName = `${triggerComponentName} (Copy)`;

  await test.step("Add trigger starter brick to mod and add bricks", async () => {
    await modListItem.modActionMenu.click();
    await modListItem.modActionMenu.addStarterBrick("Trigger");
    await pageEditorPage.brickConfigurationPanel.fillField(
      "name",
      triggerComponentName,
    );
    await pageEditorPage.brickActionsPanel.addBrick("extract from page");
    await pageEditorPage.brickActionsPanel.addBrick("Show Confetti", {
      index: 1,
    });
    await expect(brickPipeline).toHaveCount(3);
    await expect(brickPipeline.first()).toContainText("Trigger");
    await expect(brickPipeline.nth(1)).toContainText("Extract from Page");
    await expect(brickPipeline.last()).toContainText("Show Confetti");
  });

  await test.step("Duplicate trigger component within the mod", async () => {
    const triggerComponent = pageEditorPage.modListingPanel.getModStarterBrick(
      modName,
      "Trigger",
    );
    await triggerComponent.select();
    await triggerComponent.modComponentActionMenu.click();
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
    await expect(firstTriggerComponent).toHaveText(triggerComponentName);
    const firstTriggerListItem = new ModComponentListItem(
      firstTriggerComponent,
    );
    await expect(firstTriggerListItem.unavailableIcon).toBeHidden();
    await expect(firstTriggerListItem.dirtyIcon).toBeVisible();

    const secondTriggerComponent = allStarterBricks.last();
    await expect(secondTriggerComponent).toHaveText(triggerCopyComponentName);
    const secondTriggerListItem = new ModComponentListItem(
      secondTriggerComponent,
    );
    await expect(secondTriggerListItem.unavailableIcon).toBeHidden();
    await expect(secondTriggerListItem.dirtyIcon).toBeVisible();
  });

  const movedComponentName = "Moved Test Trigger component";
  const movedComponentModName = "Moved Component Test Mod";

  await test.step("Move trigger copy to a new mod", async () => {
    const triggerComponent = pageEditorPage.modListingPanel.getModStarterBrick(
      modName,
      triggerCopyComponentName,
    );
    await triggerComponent.select();
    await triggerComponent.modComponentActionMenu.click();
    await triggerComponent.modComponentActionMenu.moveFromModOption.click();

    const moveModModal = pageEditorPage.getByRole("dialog");
    await expect(moveModModal).toBeVisible();
    await expect(moveModModal).toContainText(
      `Move ${triggerCopyComponentName} to another Mod?`,
    );
    await moveModModal.getByRole("combobox").click();
    await moveModModal
      .getByRole("option", { name: "➕ Create new mod..." })
      .click();
    await moveModModal.getByRole("button", { name: "Move" }).click();

    await pageEditorPage.brickConfigurationPanel.fillField(
      "name",
      movedComponentName,
    );

    const modListItem = pageEditorPage.modListingPanel.getModListItemByName(
      triggerCopyComponentName,
    );
    await expect(modListItem.dirtyIcon).toBeVisible();
    await modListItem.select();
    await expect(modListItem.dirtyIcon).toBeHidden();
    await expect(modListItem.saveButton).toBeEnabled();
    await pageEditorPage.modEditorPane.editMetadataTabPanel.fillField(
      "name",
      movedComponentModName,
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
    await expect(copyModModal).toContainText(
      `Copy ${movedComponentName} to another Mod?`,
    );
    await copyModModal.getByRole("combobox").click();
    await copyModModal
      .getByRole("option", { name: "➕ Create new mod..." })
      .click();
    await copyModModal.getByRole("button", { name: "Copy" }).click();

    await pageEditorPage.brickConfigurationPanel.fillField(
      "name",
      copiedComponentName,
    );

    const modListItem =
      pageEditorPage.modListingPanel.getModListItemByName(movedComponentName);
    await expect(modListItem.dirtyIcon).toBeVisible();
    await modListItem.select();
    await expect(modListItem.dirtyIcon).toBeHidden();
    await expect(modListItem.saveButton).toBeEnabled();
    await pageEditorPage.modEditorPane.editMetadataTabPanel.fillField(
      "name",
      copiedComponentModName,
    );
  });

  await test.step("Add new component to the third mod and move it to the second mod", async () => {
    const thirdMod = pageEditorPage.modListingPanel.getModListItemByName(
      copiedComponentModName,
    );
    await thirdMod.select();
    await thirdMod.modActionMenu.click();
    await thirdMod.modActionMenu.addStarterBrick("Button");
    await pageEditorPage.selectConnectedPageElement(
      page.getByRole("link", { name: "navigation" }),
    );

    const newButtonName = "New Button Component";
    await pageEditorPage.brickConfigurationPanel.fillField(
      "name",
      newButtonName,
    );

    const newButtonComponent =
      pageEditorPage.modListingPanel.getModStarterBrick(
        copiedComponentModName,
        newButtonName,
      );
    await newButtonComponent.select();
    await newButtonComponent.modComponentActionMenu.click();
    await newButtonComponent.modComponentActionMenu.moveFromModOption.click();

    const moveModModal = pageEditorPage.getByRole("dialog");
    await expect(moveModModal).toBeVisible();
    await expect(moveModModal).toContainText(
      `Move ${newButtonName} to another Mod?`,
    );
    await moveModModal.getByRole("combobox").click();
    await moveModModal
      .getByRole("option", { name: movedComponentModName })
      .click();
    await moveModModal.getByRole("button", { name: "Move" }).click();

    // Verify the component has been moved
    const secondMod = pageEditorPage.modListingPanel.getModListItemByName(
      movedComponentModName,
    );
    await secondMod.select();
    const movedButtonComponent =
      pageEditorPage.modListingPanel.getModStarterBrick(
        movedComponentModName,
        newButtonName,
      );
    await expect(movedButtonComponent.root).toBeVisible();

    // Verify the component is no longer in the third mod
    await thirdMod.select();
    const oldButtonComponent =
      pageEditorPage.modListingPanel.getModStarterBrick(
        copiedComponentModName,
        newButtonName,
      );
    await expect(oldButtonComponent.root).toBeHidden();
  });

  const newQuickBarActionName = "New Quick Bar Action";

  await test.step("Add a new component to the first mod and copy it to the third mod", async () => {
    const firstMod =
      pageEditorPage.modListingPanel.getModListItemByName(modName);
    await firstMod.select();
    await firstMod.modActionMenu.click();
    await firstMod.modActionMenu.addStarterBrick("Quick Bar Action");

    await pageEditorPage.brickConfigurationPanel.fillField(
      "name",
      newQuickBarActionName,
    );

    const newQuickBarActionComponent =
      pageEditorPage.modListingPanel.getModStarterBrick(
        modName,
        newQuickBarActionName,
      );
    await newQuickBarActionComponent.select();
    await newQuickBarActionComponent.modComponentActionMenu.click();
    await newQuickBarActionComponent.modComponentActionMenu.copyToModOption.click();

    const copyModModal = pageEditorPage.getByRole("dialog");
    await expect(copyModModal).toBeVisible();
    await expect(copyModModal).toContainText(
      `Copy ${newQuickBarActionName} to another Mod?`,
    );
    await copyModModal.getByRole("combobox").click();
    await copyModModal
      .getByRole("option", { name: copiedComponentModName })
      .click();
    await copyModModal.getByRole("button", { name: "Copy" }).click();

    const thirdMod = pageEditorPage.modListingPanel.getModListItemByName(
      copiedComponentModName,
    );
    await thirdMod.select();
    const quickBarActionComponent =
      pageEditorPage.modListingPanel.getModStarterBrick(
        copiedComponentModName,
        newQuickBarActionName,
      );
    await expect(quickBarActionComponent.root).toBeVisible();

    // Verify the component is also still in the first mod
    await firstMod.select();
    const oldQuickBarActionComponent =
      pageEditorPage.modListingPanel.getModStarterBrick(
        modName,
        newQuickBarActionName,
      );
    await expect(oldQuickBarActionComponent.root).toBeVisible();
  });

  await test.step("Delete the second and third mods", async () => {
    const secondMod = pageEditorPage.modListingPanel.getModListItemByName(
      movedComponentModName,
    );
    await secondMod.select();
    await secondMod.modActionMenu.click();
    await secondMod.modActionMenu.deleteNewModOption.click();
    await pageEditorPage
      .getByRole("dialog")
      .getByRole("button", { name: "Delete" })
      .click();

    const thirdMod = pageEditorPage.modListingPanel.getModListItemByName(
      copiedComponentModName,
    );
    await thirdMod.select();
    await thirdMod.modActionMenu.click();
    await thirdMod.modActionMenu.deleteNewModOption.click();
    await pageEditorPage
      .getByRole("dialog")
      .getByRole("button", { name: "Delete" })
      .click();

    await expect(secondMod.root).toBeHidden();
    await expect(thirdMod.root).toBeHidden();
    await expect(
      pageEditorPage.modListingPanel.getModListItemByName(
        copiedComponentModName,
      ).root,
    ).toBeHidden();
    await expect(
      pageEditorPage.modListingPanel.getModListItemByName(movedComponentModName)
        .root,
    ).toBeHidden();

    // Select the first mod and verify that the components are still there
    const firstMod =
      pageEditorPage.modListingPanel.getModListItemByName(modName);
    await firstMod.select();
    await expect(
      pageEditorPage.modListingPanel.getModStarterBrick(
        modName,
        newQuickBarActionName,
      ).root,
    ).toBeVisible();
    await expect(
      pageEditorPage.modListingPanel.getModStarterBrick(
        modName,
        modComponentName,
      ).root,
    ).toBeVisible();
    await expect(
      pageEditorPage.modListingPanel.getModStarterBrick(
        modName,
        triggerComponentName,
      ).root,
    ).toBeVisible();
  });
});

test("mod actions with saved mod", async ({
  page,
  newPageEditorPage,
  verifyModDefinitionSnapshot,
}) => {
  await page.goto("/");
  const pageEditorPage = await newPageEditorPage(page.url());
  const brickPipeline = pageEditorPage.brickActionsPanel.bricks;

  const firstModName = "Test Mod created with Button";
  const secondModName = "Test Mod created with Trigger";
  const buttonComponentName = "Test Button Component";
  const quickBarComponentName = "Test Quick Bar Action";
  const triggerComponentName = "Test Trigger";
  const duplicatedComponentName = `${quickBarComponentName} (Copy)`;

  // New mod names
  const newModForButtonName = "New Mod for Button";
  const newModForTriggerCopyName = "New Mod for Trigger Copy";

  await test.step("Create and save first mod with multiple components", async () => {
    await pageEditorPage.addNewModWithButtonStarterBrick(async () => {
      await pageEditorPage.selectConnectedPageElement(
        page.getByRole("link", { name: "navigation" }),
      );
    });

    await pageEditorPage.brickConfigurationPanel.fillField(
      "name",
      buttonComponentName,
    );
    await pageEditorPage.brickActionsPanel.addBrick("Show Confetti");
    await expect(brickPipeline).toHaveCount(2);

    const modListItem =
      pageEditorPage.modListingPanel.getModListItemByName(firstModName);
    await modListItem.select();
    await modListItem.modActionMenu.click();
    await modListItem.modActionMenu.addStarterBrick("Quick Bar Action");
    await pageEditorPage.brickConfigurationPanel.fillField(
      "name",
      quickBarComponentName,
    );
    await pageEditorPage.brickActionsPanel.addBrick("extract from page");

    const modId = await pageEditorPage.saveNewMod(
      firstModName,
      "First test mod with multiple components",
    );

    await verifyModDefinitionSnapshot({
      modId,
      snapshotName: "first-saved-mod-with-multiple-components",
      mode: "current",
    });
  });

  await test.step("Create and save second mod", async () => {
    await pageEditorPage.addNewModWithNonButtonStarterBrick("Trigger");
    await pageEditorPage.brickConfigurationPanel.fillField(
      "name",
      triggerComponentName,
    );
    await pageEditorPage.brickActionsPanel.addBrick("Extract from Page");

    const modId = await pageEditorPage.saveNewMod(
      secondModName,
      "Second test mod with trigger",
    );

    await verifyModDefinitionSnapshot({
      modId,
      snapshotName: "second-saved-mod-with-trigger",
      mode: "current",
    });
  });

  await test.step("Move quick bar component from first mod to second mod", async () => {
    const firstMod =
      pageEditorPage.modListingPanel.getModListItemByName(firstModName);
    await firstMod.select();
    const quickBarComponent = pageEditorPage.modListingPanel.getModStarterBrick(
      firstModName,
      quickBarComponentName,
    );
    await quickBarComponent.select();
    await quickBarComponent.modComponentActionMenu.click();
    await quickBarComponent.modComponentActionMenu.moveFromModOption.click();

    const moveModModal = pageEditorPage.getByRole("dialog");
    await moveModModal.getByRole("combobox").click();
    await moveModModal.getByRole("option", { name: secondModName }).click();
    await moveModModal.getByRole("button", { name: "Move" }).click();

    // Verify the component has been moved
    const secondMod =
      pageEditorPage.modListingPanel.getModListItemByName(secondModName);
    await secondMod.select();
    const movedQuickBarComponent =
      pageEditorPage.modListingPanel.getModStarterBrick(
        secondModName,
        quickBarComponentName,
      );
    await expect(movedQuickBarComponent.root).toBeVisible();

    await pageEditorPage.saveExistingMod(secondModName);

    await verifyModDefinitionSnapshot({
      modId:
        await pageEditorPage.modEditorPane.editMetadataTabPanel.modId.inputValue(),
      snapshotName: "second-mod-after-moving-component",
      mode: "diff",
    });

    await pageEditorPage.saveExistingMod(firstModName);

    await verifyModDefinitionSnapshot({
      modId:
        await pageEditorPage.modEditorPane.editMetadataTabPanel.modId.inputValue(),
      snapshotName: "first-mod-after-moving-component",
      mode: "diff",
    });
  });

  await test.step("Copy button component from first mod to second mod", async () => {
    const buttonComponent = pageEditorPage.modListingPanel.getModStarterBrick(
      firstModName,
      buttonComponentName,
    );
    await buttonComponent.select();
    await buttonComponent.modComponentActionMenu.click();
    await buttonComponent.modComponentActionMenu.copyToModOption.click();

    const copyModModal = pageEditorPage.getByRole("dialog");
    await copyModModal.getByRole("combobox").click();
    await copyModModal.getByRole("option", { name: secondModName }).click();
    await copyModModal.getByRole("button", { name: "Copy" }).click();
    // Verify the component has been copied
    const secondMod =
      pageEditorPage.modListingPanel.getModListItemByName(secondModName);
    await secondMod.select();
    const copiedButtonComponent =
      pageEditorPage.modListingPanel.getModStarterBrick(
        secondModName,
        buttonComponentName,
      );
    await expect(copiedButtonComponent.root).toBeVisible();

    await pageEditorPage.saveExistingMod(secondModName);

    await verifyModDefinitionSnapshot({
      modId:
        await pageEditorPage.modEditorPane.editMetadataTabPanel.modId.inputValue(),
      snapshotName: "second-mod-after-copying-component",
      mode: "diff",
    });

    // Verify that mod one has not changed and is not marked dirty
    const firstMod =
      pageEditorPage.modListingPanel.getModListItemByName(firstModName);
    await firstMod.select();
    const firstModButtonComponent =
      pageEditorPage.modListingPanel.getModStarterBrick(
        firstModName,
        buttonComponentName,
      );
    await expect(firstModButtonComponent.root).toBeVisible();
    await expect(firstMod.dirtyIcon).toBeHidden();
    await expect(firstMod.saveButton).toBeDisabled();
  });

  await test.step("Duplicate a component in the second mod", async () => {
    const secondMod =
      pageEditorPage.modListingPanel.getModListItemByName(secondModName);
    await secondMod.select();

    const componentToDuplicate =
      pageEditorPage.modListingPanel.getModStarterBrick(
        secondModName,
        quickBarComponentName,
      );
    await componentToDuplicate.select();
    await componentToDuplicate.modComponentActionMenu.click();
    await componentToDuplicate.modComponentActionMenu.duplicateOption.click();

    const expectedDuplicateName = duplicatedComponentName;
    const duplicatedComponent =
      pageEditorPage.modListingPanel.getModStarterBrick(
        secondModName,
        expectedDuplicateName,
      );
    await expect(duplicatedComponent.root).toBeVisible();

    // Verify that both the original and duplicated components exist
    const allComponents =
      pageEditorPage.modListingPanel.getAllModStarterBricks(secondModName);
    // Original trigger, copied button, quick bar item, and the new duplicate quick bar item
    await expect(allComponents).toHaveCount(4);

    // Save and verify snapshot
    await pageEditorPage.saveExistingMod(secondModName);
    await verifyModDefinitionSnapshot({
      modId:
        await pageEditorPage.modEditorPane.editMetadataTabPanel.modId.inputValue(),
      snapshotName: "second-mod-after-duplicating-component",
      mode: "diff",
    });
  });

  await test.step("Delete the duplicated component in the second mod", async () => {
    const duplicatedComponent =
      pageEditorPage.modListingPanel.getModStarterBrick(
        secondModName,
        duplicatedComponentName,
      );
    await duplicatedComponent.select();
    await duplicatedComponent.modComponentActionMenu.click();
    await duplicatedComponent.modComponentActionMenu.deleteOption.click();

    // Confirm deletion in the modal
    const deleteModal = pageEditorPage.getByRole("dialog");
    await expect(deleteModal).toBeVisible();
    await expect(deleteModal).toContainText("Delete starter brick?");
    await deleteModal.getByRole("button", { name: "Delete" }).click();

    // Verify that the duplicated component is no longer visible
    await expect(duplicatedComponent.root).toBeHidden();

    // Verify that the original components still exist
    const allComponents =
      pageEditorPage.modListingPanel.getAllModStarterBricks(secondModName);
    await expect(allComponents).toHaveCount(3); // Original trigger, copied button, and quick bar item

    // Save and verify snapshot
    await pageEditorPage.saveExistingMod(secondModName);
    await verifyModDefinitionSnapshot({
      modId:
        await pageEditorPage.modEditorPane.editMetadataTabPanel.modId.inputValue(),
      snapshotName: "second-mod-after-deleting-duplicated-component",
      mode: "diff",
    });
  });

  await test.step("Deactivate second mod and verify removal", async () => {
    await pageEditorPage.deactivateMod(secondModName);

    // Verify the mod and its components are no longer visible
    const deactivatedMod =
      pageEditorPage.modListingPanel.getModListItemByName(secondModName);
    await expect(deactivatedMod.root).toBeHidden();

    const deactivatedTrigger =
      pageEditorPage.modListingPanel.getModStarterBrick(
        secondModName,
        triggerComponentName,
      );
    await expect(deactivatedTrigger.root).toBeHidden();

    const deactivatedQuickBar =
      pageEditorPage.modListingPanel.getModStarterBrick(
        secondModName,
        quickBarComponentName,
      );
    await expect(deactivatedQuickBar.root).toBeHidden();

    const deactivatedButton = pageEditorPage.modListingPanel.getModStarterBrick(
      secondModName,
      buttonComponentName,
    );
    await expect(deactivatedButton.root).toBeHidden();
  });

  await test.step("Move button component from first mod to a new mod", async () => {
    let firstMod =
      pageEditorPage.modListingPanel.getModListItemByName(firstModName);
    await firstMod.select();
    const buttonComponent = pageEditorPage.modListingPanel.getModStarterBrick(
      firstModName,
      buttonComponentName,
    );
    await buttonComponent.select();
    await buttonComponent.modComponentActionMenu.click();

    // Assert that the move option is disabled because the button is the only component in the mod
    await expect(
      buttonComponent.modComponentActionMenu.moveFromModOption,
    ).toBeDisabled();

    // Close the menu
    await buttonComponent.modComponentActionMenu.click();

    // Add a new Context Menu item to the mod
    await firstMod.select();
    await firstMod.modActionMenu.click();
    await firstMod.modActionMenu.addStarterBrick("Context Menu");
    const contextMenuComponentName = "New Context Menu Item";
    await pageEditorPage.brickConfigurationPanel.fillField(
      "name",
      contextMenuComponentName,
    );

    // Save the mod with the new component
    await pageEditorPage.saveExistingMod(firstModName);

    // Now select the button component again and proceed with the move operation
    await buttonComponent.select();
    await buttonComponent.modComponentActionMenu.click();
    await buttonComponent.modComponentActionMenu.moveFromModOption.click();

    const moveModModal = pageEditorPage.getByRole("dialog");
    await expect(moveModModal).toBeVisible();
    await expect(moveModModal).toContainText(
      `Move ${buttonComponentName} to another Mod?`,
    );
    await moveModModal.getByRole("combobox").click();
    await moveModModal
      .getByRole("option", { name: "➕ Create new mod..." })
      .click();
    await moveModModal.getByRole("button", { name: "Move" }).click();

    await pageEditorPage.brickConfigurationPanel.fillField(
      "name",
      newModForButtonName,
    );

    // Verify the component has been moved
    const newMod =
      pageEditorPage.modListingPanel.getModListItemByName(newModForButtonName);
    await newMod.select();
    const movedButtonComponent =
      pageEditorPage.modListingPanel.getModStarterBrick(
        newModForButtonName,
        buttonComponentName,
      );
    await expect(movedButtonComponent.root).toBeVisible();

    // Verify the component is no longer in the first mod
    firstMod =
      pageEditorPage.modListingPanel.getModListItemByName(firstModName);
    await firstMod.select();
    const oldButtonComponent =
      pageEditorPage.modListingPanel.getModStarterBrick(
        firstModName,
        buttonComponentName,
      );
    await expect(oldButtonComponent.root).toBeHidden();

    // Verify the new Context Menu item is still in the first mod
    const contextMenuComponent =
      pageEditorPage.modListingPanel.getModStarterBrick(
        firstModName,
        contextMenuComponentName,
      );
    await expect(contextMenuComponent.root).toBeVisible();

    // Save and verify snapshots
    await pageEditorPage.saveExistingMod(newModForButtonName);
    await verifyModDefinitionSnapshot({
      modId:
        await pageEditorPage.modEditorPane.editMetadataTabPanel.modId.inputValue(),
      snapshotName: "new-mod-after-moving-button-component",
      mode: "current",
    });

    await pageEditorPage.saveExistingMod(firstModName);
    await verifyModDefinitionSnapshot({
      modId:
        await pageEditorPage.modEditorPane.editMetadataTabPanel.modId.inputValue(),
      snapshotName: "first-mod-after-moving-button-component",
      mode: "diff",
    });
  });

  await test.step("Copy trigger component to another new mod", async () => {
    const triggerComponent = pageEditorPage.modListingPanel.getModStarterBrick(
      firstModName,
      triggerComponentName,
    );
    await triggerComponent.select();
    await triggerComponent.modComponentActionMenu.click();
    await triggerComponent.modComponentActionMenu.copyToModOption.click();

    const copyModModal = pageEditorPage.getByRole("dialog");
    await expect(copyModModal).toBeVisible();
    await expect(copyModModal).toContainText(
      `Copy ${triggerComponentName} to another Mod?`,
    );
    await copyModModal.getByRole("combobox").click();
    await copyModModal
      .getByRole("option", { name: "➕ Create new mod..." })
      .click();
    await copyModModal.getByRole("button", { name: "Copy" }).click();

    await pageEditorPage.brickConfigurationPanel.fillField(
      "name",
      newModForTriggerCopyName,
    );

    // Verify the component has been copied
    const newMod = pageEditorPage.modListingPanel.getModListItemByName(
      newModForTriggerCopyName,
    );
    await newMod.select();
    const copiedTriggerComponent =
      pageEditorPage.modListingPanel.getModStarterBrick(
        newModForTriggerCopyName,
        triggerComponentName,
      );
    await expect(copiedTriggerComponent.root).toBeVisible();

    // Verify the component is still in the first mod
    const firstMod =
      pageEditorPage.modListingPanel.getModListItemByName(firstModName);
    await firstMod.select();
    const originalTriggerComponent =
      pageEditorPage.modListingPanel.getModStarterBrick(
        firstModName,
        triggerComponentName,
      );
    await expect(originalTriggerComponent.root).toBeVisible();

    // Save and verify snapshots
    await pageEditorPage.saveExistingMod(newModForTriggerCopyName);
    await verifyModDefinitionSnapshot({
      modId:
        await pageEditorPage.modEditorPane.editMetadataTabPanel.modId.inputValue(),
      snapshotName: "new-mod-after-copying-trigger-component",
      mode: "current",
    });

    // Verify that the first mod hasn't changed
    await expect(firstMod.dirtyIcon).toBeHidden();
    await expect(firstMod.saveButton).toBeDisabled();
  });

  await test.step("Test clear changes functionality after moving a component", async () => {
    // Move a component from the first mod to the new mod for button
    const quickBarComponent = pageEditorPage.modListingPanel.getModStarterBrick(
      firstModName,
      quickBarComponentName,
    );
    await quickBarComponent.select();
    await quickBarComponent.modComponentActionMenu.click();
    await quickBarComponent.modComponentActionMenu.moveFromModOption.click();

    const moveModModal = pageEditorPage.getByRole("dialog");
    await moveModModal.getByRole("combobox").click();
    await moveModModal
      .getByRole("option", { name: newModForButtonName })
      .click();
    await moveModModal.getByRole("button", { name: "Move" }).click();

    // Verify the component has been moved
    const destinationMod =
      pageEditorPage.modListingPanel.getModListItemByName(newModForButtonName);
    await destinationMod.select();
    const movedComponent = pageEditorPage.modListingPanel.getModStarterBrick(
      newModForButtonName,
      quickBarComponentName,
    );
    await expect(movedComponent.root).toBeVisible();

    // Clear changes on the source mod
    const sourceMod =
      pageEditorPage.modListingPanel.getModListItemByName(firstModName);
    await sourceMod.select();
    await sourceMod.modActionMenu.click();
    await sourceMod.modActionMenu.clearOption.click();

    // Assert that the moved component has been restored on the source mod
    const restoredComponent = pageEditorPage.modListingPanel.getModStarterBrick(
      firstModName,
      quickBarComponentName,
    );
    await expect(restoredComponent.root).toBeVisible();

    // Verify that the source mod is not marked dirty and the save button is disabled
    await expect(sourceMod.dirtyIcon).toBeHidden();
    await expect(sourceMod.saveButton).toBeDisabled();

    // Verify a snapshot of the first mod
    await verifyModDefinitionSnapshot({
      modId:
        await pageEditorPage.modEditorPane.editMetadataTabPanel.modId.inputValue(),
      snapshotName: "first-mod-after-clear-changes",
      mode: "diff",
    });

    // Clear changes on the destination mod
    await destinationMod.select();
    await destinationMod.modActionMenu.click();
    await destinationMod.modActionMenu.clearOption.click();

    // Verify that the moved component has been removed from the destination mod
    await expect(movedComponent.root).toBeHidden();

    // Verify that the destination mod is not marked dirty and the save button is disabled
    await expect(destinationMod.dirtyIcon).toBeHidden();
    await expect(destinationMod.saveButton).toBeDisabled();

    // Verify a snapshot of the second mod (destination mod)
    await verifyModDefinitionSnapshot({
      modId:
        await pageEditorPage.modEditorPane.editMetadataTabPanel.modId.inputValue(),
      snapshotName: "second-mod-after-clear-changes",
      mode: "diff",
    });
  });

  await test.step("Test clear changes functionality after copying a component", async () => {
    // Copy a component from the first mod to the new mod for trigger copy
    const triggerComponent = pageEditorPage.modListingPanel.getModStarterBrick(
      firstModName,
      triggerComponentName,
    );
    await triggerComponent.select();
    await triggerComponent.modComponentActionMenu.click();
    await triggerComponent.modComponentActionMenu.copyToModOption.click();

    const copyModModal = pageEditorPage.getByRole("dialog");
    await copyModModal.getByRole("combobox").click();
    await copyModModal
      .getByRole("option", { name: newModForTriggerCopyName })
      .click();
    await copyModModal.getByRole("button", { name: "Copy" }).click();

    // Verify the component has been copied
    const destinationMod = pageEditorPage.modListingPanel.getModListItemByName(
      newModForTriggerCopyName,
    );
    await destinationMod.select();
    const copiedComponent = pageEditorPage.modListingPanel.getModStarterBrick(
      newModForTriggerCopyName,
      triggerComponentName,
    );
    await expect(copiedComponent.root).toBeVisible();

    // Verify that the original component still exists in the source mod
    const sourceMod =
      pageEditorPage.modListingPanel.getModListItemByName(firstModName);
    await sourceMod.select();
    const originalComponent = pageEditorPage.modListingPanel.getModStarterBrick(
      firstModName,
      triggerComponentName,
    );
    await expect(originalComponent.root).toBeVisible();

    // Clear changes on the destination mod
    await destinationMod.select();
    await destinationMod.modActionMenu.click();
    await destinationMod.modActionMenu.clearOption.click();

    // Verify that the copied component has been removed from the destination mod
    await expect(copiedComponent.root).toBeHidden();

    // Verify that the destination mod is not marked dirty and the save button is disabled
    await expect(destinationMod.dirtyIcon).toBeHidden();
    await expect(destinationMod.saveButton).toBeDisabled();

    // Verify a snapshot of the destination mod
    await verifyModDefinitionSnapshot({
      modId:
        await pageEditorPage.modEditorPane.editMetadataTabPanel.modId.inputValue(),
      snapshotName: "destination-mod-after-clear-changes-copy",
      mode: "diff",
    });

    // Verify that the source mod hasn't changed
    await sourceMod.select();
    await expect(originalComponent.root).toBeVisible();
    await expect(sourceMod.dirtyIcon).toBeHidden();
    await expect(sourceMod.saveButton).toBeDisabled();

    // Verify a snapshot of the source mod
    await verifyModDefinitionSnapshot({
      modId:
        await pageEditorPage.modEditorPane.editMetadataTabPanel.modId.inputValue(),
      snapshotName: "source-mod-after-copy-and-clear-changes",
      mode: "diff",
    });
  });

  await test.step("Deactivate all mods and verify removal", async () => {
    const modNames = [
      firstModName,
      newModForButtonName,
      newModForTriggerCopyName,
    ];

    for (const modToDeactivate of modNames) {
      await pageEditorPage.deactivateMod(modToDeactivate);

      // Verify the deactivated mod and its components are no longer visible
      const deactivatedMod =
        pageEditorPage.modListingPanel.getModListItemByName(modToDeactivate);
      await expect(deactivatedMod.root).toBeHidden();

      // Verify snapshots of remaining mods
      for (const remainingModName of modNames.filter(
        (name) => name !== modToDeactivate,
      )) {
        const remainingMod =
          pageEditorPage.modListingPanel.getModListItemByName(remainingModName);
        await remainingMod.select();

        await verifyModDefinitionSnapshot({
          modId:
            await pageEditorPage.modEditorPane.editMetadataTabPanel.modId.inputValue(),
          snapshotName: `remaining-mod-${remainingModName}-after-deactivating-${modToDeactivate}`,
          mode: "diff",
        });

        // Verify that the remaining mod is not affected
        await expect(remainingMod.root).toBeVisible();
        await expect(remainingMod.dirtyIcon).toBeHidden();
        await expect(remainingMod.saveButton).toBeDisabled();
      }
    }

    // Verify that all mods have been removed
    for (const modName of modNames) {
      const mod = pageEditorPage.modListingPanel.getModListItemByName(modName);
      await expect(mod.root).toBeHidden();
    }
  });
});
