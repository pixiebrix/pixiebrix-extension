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

test("#8104: Do not automatically close the sidebar when saving in the Page Editor", async ({
  page,
  newPageEditorPage,
  extensionId,
  chromiumChannel,
}) => {
  await page.goto("/");
  const pageEditorPage = await newPageEditorPage(page.url());

  /* eslint-disable-next-line playwright/no-conditional-in-test -- MS Edge has a bug where the page editor
   * cannot open the sidebar unless it is already focused.
   * https://www.loom.com/share/fbad85e901794161960b737b27a13677
   */
  if (isMsEdge(chromiumChannel)) {
    await page.bringToFront();
  }

  await pageEditorPage.modListingPanel.addNewMod({
    starterBrickName: "Sidebar Panel",
  });

  const sidebar = await getSidebarPage(page, extensionId);
  await expect(
    sidebar.getByRole("tab", { name: "Sidebar Panel" }),
  ).toBeVisible();

  const updatedTabTitle = "Updated Tab Title";
  await pageEditorPage.brickConfigurationPanel.fillField(
    "Tab Title",
    updatedTabTitle,
  );

  await pageEditorPage.getRenderPanelButton().click();
  await expect(
    sidebar.getByRole("tab", { name: updatedTabTitle }),
  ).toBeVisible();

  await pageEditorPage.saveNewMod({
    currentModName: "New Mod",
    descriptionOverride: "Created by playwright test",
  });

  await expect(
    sidebar.getByRole("tab", { name: updatedTabTitle }),
  ).toBeVisible();
});
