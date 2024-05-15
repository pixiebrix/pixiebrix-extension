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

import { expect, test } from "../fixtures/extensionBase";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { test as base } from "@playwright/test";
import { ModsPage } from "../pageObjects/extensionConsole/modsPage";

test("create, run, package, and update mod", async ({
  page,
  extensionId,
  newPageEditorPage,
}) => {
  await page.goto("/create-react-app/table");
  const pageEditorPage = await newPageEditorPage(page.url());
  const pageEditorPageRef = pageEditorPage.getPage();

  const modName = await pageEditorPage.addStarterBrick("Button", async () => {
    await page.bringToFront();
    await page.getByRole("button", { name: "Action #3" }).click();

    await pageEditorPage.bringToFront();
  });

  await test.step("Add the Extract from Page brick and configure it", async () => {
    await pageEditorPage.addBrickToModComponent("extract from page");

    await pageEditorPageRef.getByPlaceholder("Property name").click();
    await pageEditorPageRef
      .getByPlaceholder("Property name")
      .fill("searchText");
    await expect(
      pageEditorPageRef.getByPlaceholder("Property name"),
    ).toHaveValue("searchText");

    await pageEditorPageRef.getByLabel("Select element").focus();
    await page.pause();
    await pageEditorPageRef.getByLabel("Select element").click();

    await page.bringToFront();
    await expect(page.getByText("Selection Tool: 0 matching")).toBeVisible();
    await page.getByRole("heading", { name: "Transaction Table" }).click();

    await pageEditorPage.bringToFront();
    await expect(
      pageEditorPageRef.getByPlaceholder("Select an element"),
    ).toHaveValue("#root h1");
  });

  await test.step("Add the YouTube search brick and configure it", async () => {
    await pageEditorPage.addBrickToModComponent("YouTube search in new tab", {
      index: 1,
    });

    await pageEditorPageRef.getByLabel("Query").click();
    await pageEditorPageRef
      .getByLabel("Query")
      .fill("{{ @data.searchText}} + Finance");

    await page.pause();
  });

  const modsPage = new ModsPage(page, extensionId);
  await modsPage.goto();
  await expect(
    page.locator(".list-group-item", { hasText: modName }),
  ).toBeVisible();
});
