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
import { getSidebarPage, isMsEdge, isSidebarOpen } from "../../utils";

test("live editing behavior", async ({
  page,
  extensionId,
  newPageEditorPage,
  chromiumChannel,
}) => {
  await test.step("Activate test mod and navigate to testing site", async () => {
    const modId = "@e2e-testing/page-editor-live-editing-test";
    const activationPage = new ActivateModPage(page, extensionId, modId);
    await activationPage.goto();
    await activationPage.clickActivateAndWaitForModsPageRedirect();

    await page.goto("/advanced-fields/");
  });

  const pageEditor = await newPageEditorPage(page.url());

  const modListItem =
    pageEditor.modListingPanel.getModListItemByName("Live Editing Test");
  await modListItem.select();

  await test.step("Verify run trigger functionality", async () => {
    await pageEditor.modListingPanel
      .getModStarterBrick("Live Editing Test", "My pbx.vercel.app trigger")
      .select();

    await expect(pageEditor.editorPane.runTriggerButton).toBeVisible();

    await pageEditor.brickActionsPanel.getBrickByName("Window Alert").select();
    await pageEditor.brickConfigurationPanel.fillField("Alert message", "🐶");

    await pageEditor.editorPane.runTriggerButton.click();
    await expect(
      page.getByRole("status").filter({ hasText: "🐶" }),
    ).toBeVisible();

    await pageEditor.editorPane.autoRunTrigger.click();

    await pageEditor.brickConfigurationPanel.fillField("Alert message", "😻");
    await expect(
      page.getByRole("status").filter({ hasText: "😻" }),
    ).toBeVisible();
  });

  await test.step("Verify render panel functionality", async () => {
    await pageEditor.modListingPanel
      .getModStarterBrick("Live Editing Test", "Sidebar Panel")
      .select();

    await expect(pageEditor.editorPane.renderPanelButton).toBeVisible();

    expect(isSidebarOpen(page, extensionId)).toBe(false);

    /* eslint-disable-next-line playwright/no-conditional-in-test -- MS Edge has a bug where the page editor
     * cannot open the sidebar, unless the target page is already focused.
     * https://www.loom.com/share/fbad85e901794161960b737b27a13677
     */
    if (isMsEdge(chromiumChannel)) {
      await page.bringToFront();
    }

    await pageEditor.editorPane.renderPanelButton.click();
    const sidebar = await getSidebarPage(page, extensionId);
    await expect(
      sidebar.getByRole("tab", { name: "Sidebar Panel" }),
    ).toBeVisible();
    await expect(
      sidebar.getByRole("heading", { name: "Example document" }),
    ).toBeVisible();

    await pageEditor.brickActionsPanel
      .getBrickByName("Render Document")
      .select();
    await pageEditor.dataPanel
      .locator(".col", { hasText: "Example document" })
      .click();

    await pageEditor.editorPane.autoRenderPanel.click();

    await pageEditor.brickConfigurationPanel.fillField("Title", "🦄");

    await expect(sidebar.getByRole("heading", { name: "🦄" })).toBeVisible();
  });

  await test.step("Verify starter-brick specific buttons are hidden in other starter bricks", async () => {
    await pageEditor.modListingPanel
      .getModStarterBrick("Live Editing Test", "Context menu item")
      .select();
    await expect(pageEditor.editorPane.renderPanelButton).toBeHidden();
    await expect(pageEditor.editorPane.runTriggerButton).toBeHidden();
  });
});
