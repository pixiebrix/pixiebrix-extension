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
import { getSidebarPage } from "../../utils";

test("#8104: Do not automatically close the sidebar when saving in the Page Editor", async ({
  page,
  newPageEditorPage,
  extensionId,
}) => {
  await page.goto("/");
  const pageEditorPage = await newPageEditorPage(page.url());

  const { modComponentName } =
    await pageEditorPage.modListingPanel.addStarterBrick("Sidebar Panel");
  await pageEditorPage.brickConfigurationPanel.fillField(
    "name",
    modComponentName,
  );

  const sidebar = await getSidebarPage(page, extensionId);
  await expect(
    sidebar.getByRole("tab", { name: "Sidebar Panel" }),
  ).toBeVisible();

  const updatedTabTitle = "Updated Tab Title";
  await pageEditorPage.brickConfigurationPanel.fillField(
    "Tab Title",
    updatedTabTitle,
  );

  // Formik syncs form state with redux every 100ms. The "Render Panel" button
  // sends the form state to the sidebar, but the save functionality uses the
  // redux state for the mod component. This 100ms delay is fine in practice
  // for real users, but playwright is able to click render and then click save
  // within this 100ms timeout, which causes a race condition and makes this
  // test flaky. So, we need a delay here to wait for the sync.
  // eslint-disable-next-line playwright/no-wait-for-timeout -- see above
  await page.waitForTimeout(200);

  await pageEditorPage.getRenderPanelButton().click();
  await expect(
    sidebar.getByRole("tab", { name: updatedTabTitle }),
  ).toBeVisible();

  await pageEditorPage.saveStandaloneMod(modComponentName);

  await expect(
    sidebar.getByRole("tab", { name: updatedTabTitle }),
  ).toBeVisible();
});
