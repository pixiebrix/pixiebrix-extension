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

test("Add new Button starter brick", async ({ page, newPageEditorPage }) => {
  await page.goto("/");
  const pageEditorPage = await newPageEditorPage(page.url());
  await pageEditorPage.modListingPanel.addStarterBrick("Button");
  await page.locator("#files .folder").first().click();
  const brickPipeline =
    await pageEditorPage.brickActionsPanel.getBricksInPipeline();
  expect(brickPipeline).toHaveLength(1);
  await expect(brickPipeline[0]).toContainText("Button");
  await expect(
    pageEditorPage.brickConfigurationPanel.getByRole("textbox", {
      name: "Name",
    }),
  ).toHaveValue("My pbx.vercel.app button");
});

test("Add new Context Menu starter brick", async ({
  page,
  newPageEditorPage,
}) => {
  await page.goto("/");
  const pageEditorPage = await newPageEditorPage(page.url());
  await pageEditorPage.modListingPanel.addStarterBrick("Context Menu");
  const brickPipeline =
    await pageEditorPage.brickActionsPanel.getBricksInPipeline();
  expect(brickPipeline).toHaveLength(1);
  await expect(brickPipeline[0]).toContainText("Context Menu");
  await expect(
    pageEditorPage.brickConfigurationPanel.getByRole("textbox", {
      name: "Name",
    }),
  ).toHaveValue("Context menu item");
});

test("Add new Quick Bar Action starter brick", async ({
  page,
  newPageEditorPage,
}) => {
  await page.goto("/");
  const pageEditorPage = await newPageEditorPage(page.url());
  await pageEditorPage.modListingPanel.addStarterBrick("Quick Bar Action");
  const brickPipeline =
    await pageEditorPage.brickActionsPanel.getBricksInPipeline();
  expect(brickPipeline).toHaveLength(1);
  await expect(brickPipeline[0]).toContainText("Quick Bar Action");
  await expect(
    pageEditorPage.brickConfigurationPanel.getByRole("textbox", {
      name: "Name",
    }),
  ).toHaveValue("Quick Bar item");
});

test("Add new Sidebar Panel starter brick", async ({
  page,
  newPageEditorPage,
  extensionId,
}) => {
  await page.goto("/");
  const pageEditorPage = await newPageEditorPage(page.url());
  await pageEditorPage.modListingPanel.addStarterBrick("Sidebar Panel");
  const brickPipeline =
    await pageEditorPage.brickActionsPanel.getBricksInPipeline();
  expect(brickPipeline).toHaveLength(2);
  await expect(brickPipeline[0]).toContainText("Sidebar Panel");
  await expect(
    pageEditorPage.brickConfigurationPanel.getByRole("textbox", {
      name: "Name",
    }),
  ).toHaveValue("Sidebar Panel");

  const sidebarPage = await getSidebarPage(page, extensionId);
  await expect(sidebarPage.getByText("Example Document")).toBeVisible();
});
