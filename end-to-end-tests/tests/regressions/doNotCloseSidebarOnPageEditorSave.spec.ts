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

// eslint-disable-next-line playwright/no-skipped-test -- There is a race condition that makes this flaky, we will fix later
test.skip("#8104: Do not automatically close the sidebar when saving in the Page Editor", async ({
  page,
  newPageEditorPage,
  extensionId,
}) => {
  await page.goto("/");
  const pageEditorPage = await newPageEditorPage(page.url());

  const { modComponentName } =
    await pageEditorPage.modListingPanel.addNewModWithStarterBrick(
      "Sidebar Panel",
    );
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

  await pageEditorPage.getRenderPanelButton().click();
  await expect(
    sidebar.getByRole("tab", { name: updatedTabTitle }),
  ).toBeVisible();

  await pageEditorPage.saveActiveMod();

  await expect(
    sidebar.getByRole("tab", { name: updatedTabTitle }),
  ).toBeVisible();
});
