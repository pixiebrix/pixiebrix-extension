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
import { clickAndWaitForNewPage } from "end-to-end-tests/utils";

test("create, run, package, and update mod", async ({
  page,
  extensionId,
  newPageEditorPage,
  context,
}) => {
  await page.goto("/create-react-app/table");
  const pageEditorPage = await newPageEditorPage(page.url());

  const { modName, modUuid } = await pageEditorPage.addStarterBrick("Button", {
    async callback() {
      await page.bringToFront();
      await page.getByRole("button", { name: "Action #3" }).click();

      await pageEditorPage.bringToFront();

      await pageEditorPage.getByLabel("Button text").click();
      await pageEditorPage.getByLabel("Button text").fill("Search Youtube");
    },
  });

  await test.step("Add the Extract from Page brick and configure it", async () => {
    await pageEditorPage.addBrickToModComponent("extract from page");

    await pageEditorPage.getByPlaceholder("Property name").click();
    await pageEditorPage.getByPlaceholder("Property name").fill("searchText");
    await expect(pageEditorPage.getByPlaceholder("Property name")).toHaveValue(
      "searchText",
    );

    await pageEditorPage.getByLabel("Select element").focus();
    await pageEditorPage.getByLabel("Select element").click();

    await page.bringToFront();
    await expect(page.getByText("Selection Tool: 0 matching")).toBeVisible();
    await page.getByRole("heading", { name: "Transaction Table" }).click();

    await pageEditorPage.bringToFront();
    await expect(
      pageEditorPage.getByPlaceholder("Select an element"),
    ).toHaveValue("#root h1");

    await pageEditorPage.waitForReduxUpdate();
  });

  await test.step("Add the YouTube search brick and configure it", async () => {
    await pageEditorPage.addBrickToModComponent("YouTube search in new tab", {
      index: 1,
    });

    await pageEditorPage.getByLabel("Query").click();
    await pageEditorPage
      .getByLabel("Query")
      .fill("{{ @data.searchText }} + Foo");

    await pageEditorPage.waitForReduxUpdate();
  });

  await test.step("Save the mod", async () => {
    await pageEditorPage.createModFromModComponent("Lifecycle Test");
    await page.pause();
  });

  await test.step("Run the mod", async () => {
    const youtubePage = await clickAndWaitForNewPage(
      page.getByRole("button", { name: "Search Youtube" }),
      context,
    );
    await expect(youtubePage).toHaveURL(
      "https://www.youtube.com/results?search_query=Transaction+Table+%2B+Foo",
    );
  });

  expect(true).toBeFalsy();

  const modsPage = new ModsPage(page, extensionId);
  await modsPage.goto();
  await expect(
    page.locator(".list-group-item", { hasText: modName }),
  ).toBeVisible();
});
