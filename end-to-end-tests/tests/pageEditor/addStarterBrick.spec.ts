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

import { test, expect } from "../../fixtures/testBase";
import {
  getSidebarPage,
  isMsEdge,
  PRE_RELEASE_BROWSER_WORKFLOW_NAME,
} from "../../utils";

test("Add new mod with starter bricks", async ({
  page,
  newPageEditorPage,
  extensionId,
  chromiumChannel,
  verifyModDefinitionSnapshot,
}) => {
  await page.goto("/");
  const pageEditorPage = await newPageEditorPage(page.url());
  const brickPipeline = pageEditorPage.brickActionsPanel.bricks;

  async function saveNewMod(modName: string, description: string) {
    const modListItem =
      pageEditorPage.modListingPanel.getModListItemByName(modName);
    await modListItem.select();
    await expect(
      pageEditorPage.modEditorPane.editMetadataTabPanel.getByText(
        "Save the mod to assign an id",
      ),
    ).toBeVisible();
    // eslint-disable-next-line playwright/no-wait-for-timeout -- The save button re-renders several times so we need a slight delay here before playwright clicks
    await page.waitForTimeout(300);
    await modListItem.saveButton.click();

    // Handle the "Save new mod" modal
    const saveNewModModal = pageEditorPage.page.getByRole("dialog");
    await expect(saveNewModModal).toBeVisible();
    await expect(saveNewModModal.getByText("Save new mod")).toBeVisible();

    // Update the mod description
    const descriptionInput = saveNewModModal.locator(
      'input[name="description"]',
    );
    await descriptionInput.fill(description);

    // Click the Save button in the modal
    await saveNewModModal.getByRole("button", { name: "Save" }).click();

    // Wait for the save confirmation
    await expect(
      pageEditorPage.page
        .getByRole("status")
        .filter({ hasText: "Mod created successfully" }),
    ).toBeVisible();

    // Mark the modId for cleanup after the test
    const modId =
      await pageEditorPage.modEditorPane.editMetadataTabPanel.modId.inputValue();
    pageEditorPage.savedPackageModIds.push(modId);

    return modId;
  }

  await test.step("Add new Button starter brick", async () => {
    const { modName, modComponentName } =
      await pageEditorPage.addNewModWithButtonStarterBrick(async () => {
        await pageEditorPage.selectConnectedPageElement(
          page.getByRole("link", { name: "navigation" }),
        );
      });

    await expect(pageEditorPage.getByText(modName)).toBeVisible();
    await expect(pageEditorPage.getByText(modComponentName)).toBeVisible();
    await expect(brickPipeline).toHaveCount(1);
    await expect(brickPipeline.first()).toContainText("Button");
    await expect(
      pageEditorPage.brickConfigurationPanel.getByRole("textbox", {
        name: "Name",
      }),
    ).toHaveValue(modComponentName);

    // Ensure the new, unsaved mod component remains after reloading the page editor
    await pageEditorPage.reload();
    await expect(pageEditorPage.getByText(modName)).toBeVisible();
    await expect(pageEditorPage.getByText(modComponentName)).toBeVisible();

    const modId = await saveNewMod(modName, "Test description for Button Mod");

    await verifyModDefinitionSnapshot({
      modId,
      snapshotName: "button-starter-brick-configuration",
      mode: "current",
    });
  });

  await test.step("Add new Context Menu starter brick", async () => {
    const { modName, modComponentName } =
      await pageEditorPage.addNewModWithNonButtonStarterBrick("Context Menu");

    await expect(brickPipeline).toHaveCount(1);
    await expect(brickPipeline.first()).toContainText("Context Menu");
    await expect(
      pageEditorPage.brickConfigurationPanel.getByRole("textbox", {
        name: "Name",
      }),
    ).toHaveValue(modComponentName);

    const modId = await saveNewMod(
      modName,
      "Test description for Context Menu Mod",
    );

    await verifyModDefinitionSnapshot({
      modId,
      snapshotName: "context-menu-starter-brick-configuration",
      mode: "current",
    });
  });

  await test.step("Add new Quick Bar Action starter brick", async () => {
    const { modName, modComponentName } =
      await pageEditorPage.addNewModWithNonButtonStarterBrick(
        "Quick Bar Action",
      );

    await expect(brickPipeline).toHaveCount(1);
    await expect(brickPipeline.first()).toContainText("Quick Bar Action");
    await expect(
      pageEditorPage.brickConfigurationPanel.getByRole("textbox", {
        name: "Name",
      }),
    ).toHaveValue(modComponentName);

    const modId = await saveNewMod(
      modName,
      "Test description for Quick Bar Action Mod",
    );

    await verifyModDefinitionSnapshot({
      modId,
      snapshotName: "quick-bar-action-starter-brick-configuration",
      mode: "current",
    });
  });

  await test.step("Add new Sidebar Panel starter brick", async () => {
    const { modName, modComponentName } =
      await pageEditorPage.addNewModWithNonButtonStarterBrick("Sidebar Panel");

    await expect(brickPipeline).toHaveCount(2);
    await expect(brickPipeline.first()).toContainText("Sidebar Panel");
    await expect(brickPipeline.nth(1)).toContainText("Render Document");
    await expect(
      pageEditorPage.brickConfigurationPanel.getByRole("textbox", {
        name: "Name",
      }),
    ).toHaveValue(modComponentName);

    /* eslint-disable playwright/no-conditional-in-test, playwright/no-conditional-expect -- Edge bug, see https://github.com/pixiebrix/pixiebrix-extension/issues/9011 */
    if (!isMsEdge(chromiumChannel)) {
      const sidebarPage = await getSidebarPage(page, extensionId);
      await expect(sidebarPage.getByText("Example Document")).toBeVisible();
    }
    /* eslint-enable playwright/no-conditional-in-test, playwright/no-conditional-expect */

    const modId = await saveNewMod(
      modName,
      "Test description for Sidebar Panel Mod",
    );

    await verifyModDefinitionSnapshot({
      modId,
      snapshotName: "sidebar-panel-starter-brick-configuration",
      mode: "current",
    });
  });

  await test.step("Add new Trigger starter brick", async () => {
    const { modName, modComponentName } =
      await pageEditorPage.addNewModWithNonButtonStarterBrick("Trigger");

    await expect(brickPipeline).toHaveCount(1);
    await expect(brickPipeline.first()).toContainText("Trigger");
    await expect(
      pageEditorPage.brickConfigurationPanel.getByRole("textbox", {
        name: "Name",
      }),
    ).toHaveValue(modComponentName);

    const modId = await saveNewMod(modName, "Test description for Trigger Mod");

    await verifyModDefinitionSnapshot({
      modId,
      snapshotName: "trigger-starter-brick-configuration",
      mode: "current",
    });
  });

  await test.step("Add new from Start with a Template", async () => {
    const templatesGalleryUrl =
      /^https:\/\/www\.pixiebrix\.com\/templates-gallery/;

    const pageRequestPromise = page.waitForRequest(templatesGalleryUrl);

    await pageEditorPage.modListingPanel.newModButton.click();
    await pageEditorPage.modListingPanel
      .getByRole("button", {
        name: "Start with a Template",
      })
      .click();

    await expect(page).toHaveURL(templatesGalleryUrl);
    const pageRequest = await pageRequestPromise;
    const pageRequestResponse = await pageRequest.response();
    expect(pageRequestResponse!.status()).toBe(200);
  });
});

test("Add starter brick to mod", async ({
  page,
  newPageEditorPage,
  extensionId,
  verifyModDefinitionSnapshot,
  chromiumChannel,
}) => {
  await page.goto("/");
  const pageEditorPage = await newPageEditorPage(page.url());
  const brickPipeline = pageEditorPage.brickActionsPanel.bricks;

  async function saveNewMod(modName: string, description: string) {
    const modListItem =
      pageEditorPage.modListingPanel.getModListItemByName(modName);
    await modListItem.select();
    await expect(
      pageEditorPage.modEditorPane.editMetadataTabPanel.getByText(
        "Save the mod to assign an id",
      ),
    ).toBeVisible();
    // eslint-disable-next-line playwright/no-wait-for-timeout -- The save button re-renders several times so we need a slight delay here before playwright clicks
    await page.waitForTimeout(300);
    await modListItem.saveButton.click();

    // Handle the "Save new mod" modal
    const saveNewModModal = pageEditorPage.page.getByRole("dialog");
    await expect(saveNewModModal).toBeVisible();
    await expect(saveNewModModal.getByText("Save new mod")).toBeVisible();

    // Update the mod description
    const descriptionInput = saveNewModModal.locator(
      'input[name="description"]',
    );
    await descriptionInput.fill(description);

    // Click the Save button in the modal
    await saveNewModModal.getByRole("button", { name: "Save" }).click();

    // Wait for the save confirmation
    await expect(
      pageEditorPage.page
        .getByRole("status")
        .filter({ hasText: "Mod created successfully" }),
    ).toBeVisible();

    // Mark the modId for cleanup after the test
    const modId =
      await pageEditorPage.modEditorPane.editMetadataTabPanel.modId.inputValue();
    pageEditorPage.savedPackageModIds.push(modId);

    return modId;
  }

  // Create Trigger mod to which to add starter bricks
  const { modName, modComponentName } =
    await pageEditorPage.addNewModWithNonButtonStarterBrick("Trigger");
  await pageEditorPage.brickConfigurationPanel.fillField(
    "name",
    modComponentName,
  );

  const modId = await saveNewMod(modName, "Test description for Trigger Mod");

  await verifyModDefinitionSnapshot({
    modId,
    snapshotName: "new-mod-with-trigger-starter-brick",
    mode: "current",
  });

  const modListItem =
    pageEditorPage.modListingPanel.getModListItemByName(modName);

  const openModActionMenu = async () => {
    await modListItem.select();
    await modListItem.menuButton.click();
    return modListItem.modActionMenu;
  };

  await test.step("Add Button starter brick to mod", async () => {
    const modActionMenu = await openModActionMenu();
    await modActionMenu.addStarterBrick("Button");
    await pageEditorPage.selectConnectedPageElement(
      page.getByRole("link", { name: "navigation" }),
    );

    await expect(
      pageEditorPage.getByText("My pbx.vercel.app button"),
    ).toBeVisible();
    await expect(brickPipeline).toHaveCount(1);
    await expect(brickPipeline.first()).toContainText("Button");
    await expect(
      pageEditorPage.brickConfigurationPanel.getByRole("textbox", {
        name: "Name",
      }),
    ).toHaveValue("My pbx.vercel.app button");

    await modListItem.select();
    await modListItem.saveButton.click();
    await verifyModDefinitionSnapshot({
      modId,
      snapshotName: "add-button-starter-brick-to-mod",
      mode: "diff",
    });
  });

  await test.step("Add Context Menu starter brick to mod", async () => {
    const modActionMenu = await openModActionMenu();
    await modActionMenu.addStarterBrick("Context Menu");

    await expect(brickPipeline).toHaveCount(1);
    await expect(brickPipeline.first()).toContainText("Context Menu");
    await expect(
      pageEditorPage.brickConfigurationPanel.getByRole("textbox", {
        name: "Name",
      }),
    ).toHaveValue("Context menu item");

    await modListItem.select();
    await modListItem.saveButton.click();
    await verifyModDefinitionSnapshot({
      modId,
      snapshotName: "add-context-menu-starter-brick-to-mod",
      mode: "diff",
    });
  });

  await test.step("Add Quick Bar Action starter brick to mod", async () => {
    const modActionMenu = await openModActionMenu();
    await modActionMenu.addStarterBrick("Quick Bar Action");

    await expect(brickPipeline).toHaveCount(1);
    await expect(brickPipeline.first()).toContainText("Quick Bar Action");
    await expect(
      pageEditorPage.brickConfigurationPanel.getByRole("textbox", {
        name: "Name",
      }),
    ).toHaveValue("Quick Bar item");

    await modListItem.select();
    await modListItem.saveButton.click();
    await verifyModDefinitionSnapshot({
      modId,
      snapshotName: "add-quick-bar-starter-brick-to-mod",
      mode: "diff",
    });
  });

  await test.step("Add Sidebar Panel starter brick to mod", async () => {
    const modActionMenu = await openModActionMenu();
    await modActionMenu.addStarterBrick("Sidebar Panel");

    await expect(brickPipeline).toHaveCount(2);
    await expect(brickPipeline.first()).toContainText("Sidebar Panel");
    await expect(brickPipeline.nth(1)).toContainText("Render Document");
    await expect(
      pageEditorPage.brickConfigurationPanel.getByRole("textbox", {
        name: "Name",
      }),
    ).toHaveValue("Sidebar Panel item");

    const sidebarPage = await getSidebarPage(page, extensionId);
    await expect(sidebarPage.getByText("Example Document")).toBeVisible();

    await modListItem.select();
    await modListItem.saveButton.click();
    await verifyModDefinitionSnapshot({
      modId,
      snapshotName: "add-sidebar-panel-starter-brick-to-mod",
      mode: "diff",
    });
  });

  await test.step("Add Trigger starter brick to mod", async () => {
    test.fixme(
      process.env.GITHUB_WORKFLOW === PRE_RELEASE_BROWSER_WORKFLOW_NAME &&
        isMsEdge(chromiumChannel),
      "Skipping test for MS Edge in pre-release workflow, see https://github.com/pixiebrix/pixiebrix-extension/issues/9125",
    );

    const modActionMenu = await openModActionMenu();
    await modActionMenu.addStarterBrick("Trigger");

    await expect(brickPipeline).toHaveCount(1);
    await expect(brickPipeline.first()).toContainText("Trigger");
    await expect(
      pageEditorPage.brickConfigurationPanel.getByRole("textbox", {
        name: "Name",
      }),
    ).toHaveValue("My pbx.vercel.app trigger");

    await modListItem.select();
    await modListItem.saveButton.click();
    await verifyModDefinitionSnapshot({
      modId,
      snapshotName: "add-trigger-starter-brick-to-mod",
      mode: "diff",
    });
  });
});
