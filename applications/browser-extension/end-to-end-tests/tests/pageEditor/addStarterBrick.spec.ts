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

// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { type Page, test as base } from "@playwright/test";
import { getSidebarPage, isMsEdge } from "../../utils";

test("Add new mod with different starter brick components", async ({
  page,
  newPageEditorPage,
  extensionId,
  chromiumChannel,
}) => {
  await page.goto("/");
  const pageEditorPage = await newPageEditorPage(page.url());
  const brickPipeline = pageEditorPage.brickActionsPanel.bricks;

  await test.step("Add new Button starter brick", async () => {
    const { modComponentNameMatcher } =
      await pageEditorPage.modListingPanel.addNewMod({
        starterBrickName: "Button",
      });

    await pageEditorPage.selectConnectedPageElement(
      page.getByRole("link", { name: "navigation" }),
    );

    await expect(
      pageEditorPage.getByText(modComponentNameMatcher),
    ).toBeVisible();
    await expect(brickPipeline).toHaveCount(1);
    await expect(brickPipeline.first()).toContainText("Button");
    await expect(
      pageEditorPage.brickConfigurationPanel.getByRole("textbox", {
        name: "Name",
      }),
    ).toHaveValue(modComponentNameMatcher);

    // Ensure the new, unsaved mod component remains after reloading the page editor
    // See: https://github.com/pixiebrix/pixiebrix-extension/pull/9002
    await pageEditorPage.reload();
    await expect(
      pageEditorPage.getByText(modComponentNameMatcher),
    ).toBeVisible();

    // TODO: save the mod and verify the snapshot of the mod definition with `verifyModDefinitionSnapshot` fixture
  });

  await test.step("Add new Context Menu starter brick", async () => {
    const { modComponentNameMatcher } =
      await pageEditorPage.modListingPanel.addNewMod({
        starterBrickName: "Context Menu",
      });
    await expect(brickPipeline).toHaveCount(1);
    await expect(brickPipeline.first()).toContainText("Context Menu");
    await expect(
      pageEditorPage.brickConfigurationPanel.getByRole("textbox", {
        name: "Name",
      }),
    ).toHaveValue(modComponentNameMatcher);
  });

  await test.step("Add new Quick Bar Action starter brick", async () => {
    const { modComponentNameMatcher } =
      await pageEditorPage.modListingPanel.addNewMod({
        starterBrickName: "Quick Bar Action",
      });
    await expect(brickPipeline).toHaveCount(1);
    await expect(brickPipeline.first()).toContainText("Quick Bar Action");
    await expect(
      pageEditorPage.brickConfigurationPanel.getByRole("textbox", {
        name: "Name",
      }),
    ).toHaveValue(modComponentNameMatcher);
  });

  await test.step("Add new Sidebar Panel starter brick", async () => {
    // eslint-disable-next-line playwright/no-conditional-in-test -- MSedge won't open the sidebar unless the target page is focused
    if (isMsEdge(chromiumChannel)) {
      await page.bringToFront();
    }

    const { modComponentNameMatcher } =
      await pageEditorPage.modListingPanel.addNewMod({
        starterBrickName: "Sidebar Panel",
      });
    await expect(brickPipeline).toHaveCount(2);
    await expect(brickPipeline.first()).toContainText("Sidebar Panel");
    await expect(brickPipeline.nth(1)).toContainText("Render Document");
    await expect(
      pageEditorPage.brickConfigurationPanel.getByRole("textbox", {
        name: "Name",
      }),
    ).toHaveValue(modComponentNameMatcher);

    const sidebarPage = await getSidebarPage(page, extensionId);
    await expect(sidebarPage.getByText("Example Document")).toBeVisible();
  });

  await test.step("Add new Trigger starter brick", async () => {
    const { modComponentNameMatcher } =
      await pageEditorPage.modListingPanel.addNewMod({
        starterBrickName: "Trigger",
      });
    await expect(brickPipeline).toHaveCount(1);
    await expect(brickPipeline.first()).toContainText("Trigger");
    await expect(
      pageEditorPage.brickConfigurationPanel.getByRole("textbox", {
        name: "Name",
      }),
    ).toHaveValue(modComponentNameMatcher);
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
  test.slow(
    true,
    "Longer test due to verifying each starter brick definition in one user flow",
  );

  await page.goto("/");
  const pageEditorPage = await newPageEditorPage(page.url());
  const brickPipeline = pageEditorPage.brickActionsPanel.bricks;

  // Create arbitrary mod to which to add starter bricks
  await pageEditorPage.modListingPanel.addNewMod({
    starterBrickName: "Trigger",
  });
  const modName = "New Mod";
  const { modId } = await pageEditorPage.saveNewMod({
    currentModName: modName,
    descriptionOverride:
      "Created by playwright test for adding starter bricks to a mod",
  });

  const modListItem =
    pageEditorPage.modListingPanel.getModListItemByName(modName);

  await test.step("Add Button starter brick to mod", async () => {
    const modActionMenu = await modListItem.openModActionMenu();
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
    await pageEditorPage.saveActiveMod();
    await verifyModDefinitionSnapshot({
      modId,
      snapshotName: "add-button-starter-brick-to-mod",
      mode: "current",
    });
  });

  await test.step("Add Context Menu starter brick to mod", async () => {
    const modActionMenu = await modListItem.openModActionMenu();
    await modActionMenu.addStarterBrick("Context Menu");

    await expect(brickPipeline).toHaveCount(1);
    await expect(brickPipeline.first()).toContainText("Context Menu");
    await expect(
      pageEditorPage.brickConfigurationPanel.getByRole("textbox", {
        name: "Name",
      }),
    ).toHaveValue("Context menu item");

    await modListItem.select();
    await pageEditorPage.saveActiveMod();
    await verifyModDefinitionSnapshot({
      modId,
      snapshotName: "add-context-menu-starter-brick-to-mod",
      mode: "diff",
    });
  });

  await test.step("Add Quick Bar Action starter brick to mod", async () => {
    const modActionMenu = await modListItem.openModActionMenu();
    await modActionMenu.addStarterBrick("Quick Bar Action");

    await expect(brickPipeline).toHaveCount(1);
    await expect(brickPipeline.first()).toContainText("Quick Bar Action");
    await expect(
      pageEditorPage.brickConfigurationPanel.getByRole("textbox", {
        name: "Name",
      }),
    ).toHaveValue("Quick Bar item");

    await modListItem.select();
    await pageEditorPage.saveActiveMod();
    await verifyModDefinitionSnapshot({
      modId,
      snapshotName: "add-quick-bar-starter-brick-to-mod",
      mode: "diff",
    });
  });

  await test.step("Add Sidebar Panel starter brick to mod", async () => {
    // eslint-disable-next-line playwright/no-conditional-in-test -- MSedge won't open the sidebar unless the target page is focused
    if (isMsEdge(chromiumChannel)) {
      await page.bringToFront();
    }

    const modActionMenu = await modListItem.openModActionMenu();
    await modActionMenu.addStarterBrick("Sidebar Panel");

    await expect(brickPipeline).toHaveCount(2);
    await expect(brickPipeline.first()).toContainText("Sidebar Panel");
    await expect(brickPipeline.nth(1)).toContainText("Render Document");
    await expect(
      pageEditorPage.brickConfigurationPanel.getByRole("textbox", {
        name: "Name",
      }),
    ).toHaveValue("Sidebar Panel");

    const sidebarPage = await getSidebarPage(page, extensionId);
    await expect(sidebarPage.getByText("Example Document")).toBeVisible();

    await modListItem.select();
    await pageEditorPage.saveActiveMod();
    await verifyModDefinitionSnapshot({
      modId,
      snapshotName: "add-sidebar-panel-starter-brick-to-mod",
      mode: "diff",
    });
  });

  await test.step("Add Trigger starter brick to mod", async () => {
    const modActionMenu = await modListItem.openModActionMenu();
    await modActionMenu.addStarterBrick("Trigger");

    await expect(brickPipeline).toHaveCount(1);
    await expect(brickPipeline.first()).toContainText("Trigger");
    await expect(
      pageEditorPage.brickConfigurationPanel.getByRole("textbox", {
        name: "Name",
      }),
    ).toHaveValue("My pbx.vercel.app trigger");

    await modListItem.select();
    await pageEditorPage.saveActiveMod();
    await verifyModDefinitionSnapshot({
      modId,
      snapshotName: "add-trigger-starter-brick-to-mod",
      mode: "diff",
    });
  });
});
