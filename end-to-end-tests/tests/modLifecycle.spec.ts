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

import { expect, test } from "../fixtures/testBase";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { type Page, test as base } from "@playwright/test";
import { ModsPage } from "../pageObjects/extensionConsole/modsPage";
import { clickAndWaitForNewPage } from "end-to-end-tests/utils";
import { WorkshopPage } from "end-to-end-tests/pageObjects/extensionConsole/workshop/workshopPage";

test("create, run, package, and update mod", async ({
  page,
  extensionId,
  newPageEditorPage,
  context,
}) => {
  await page.goto("/create-react-app/table");
  const pageEditorPage = await newPageEditorPage(page.url());

  const { modComponentName, modUuid } =
    await pageEditorPage.modListingPanel.addStarterBrick("Button");

  await test.step("Configure the Button brick", async () => {
    await page.bringToFront();
    await page.getByRole("button", { name: "Action #3" }).click();

    await pageEditorPage.bringToFront();
    await pageEditorPage.getByLabel("Button text").fill("Search Youtube");
    await pageEditorPage.setStarterBrickName(modComponentName);
  });

  await test.step("Add the Extract from Page brick and configure it", async () => {
    await pageEditorPage.addBrickToModComponent("extract from page");

    await pageEditorPage.getByPlaceholder("Property name").fill("searchText");
    await expect(pageEditorPage.getByPlaceholder("Property name")).toHaveValue(
      "searchText",
    );

    await pageEditorPage.selectConnectedPageElement(page);
  });

  await test.step("Add the YouTube search brick and configure it", async () => {
    await pageEditorPage.addBrickToModComponent("YouTube search in new tab", {
      index: 1,
    });

    await pageEditorPage.getByLabel("Query").click();
    await pageEditorPage.fillInBrickField(
      "Query",
      "{{ @data.searchText }} + Foo",
    );

    await pageEditorPage.waitForReduxUpdate();
  });

  const { modId } = await pageEditorPage.createModFromModComponent({
    modNameRoot: "Lifecycle Test",
    modComponentName,
    modUuid,
  });

  let newPage: Page | undefined;
  await test.step("Run the mod", async () => {
    newPage = await clickAndWaitForNewPage(
      page.getByRole("button", { name: "Search Youtube" }),
      context,
    );
    await expect(newPage).toHaveURL(
      "https://www.youtube.com/results?search_query=Transaction+Table+%2B+Foo",
    );
  });

  await test.step("View and update mod in the Workshop", async () => {
    const workshopPage = new WorkshopPage(newPage, extensionId);
    await workshopPage.goto();
    const editWorkshopModPage = await workshopPage.findAndSelectMod(modId);
    await editWorkshopModPage.editor.findAndReplaceText(
      "version: 1.0.0",
      "version: 1.0.1",
    );
    await editWorkshopModPage.editor.findAndReplaceText(
      "description: Created with the PixieBrix Page Editor",
      "description: Created through Playwright Automation",
    );
    await editWorkshopModPage.updateBrick();
  });

  await test.step("View the updated mod on the mods page", async () => {
    const modsPage = new ModsPage(newPage, extensionId);
    await modsPage.goto();

    await modsPage.viewActiveMods();
    const modListing = modsPage.modTableItemById(modId);

    await expect(
      modListing.getByRole("button", { name: "Update" }),
    ).toBeVisible();
    await modListing.getByRole("button", { name: "Update" }).click();

    await expect(modsPage.locator("form")).toContainText(
      "Created through Playwright Automation",
    );

    await expect(
      modsPage.getByRole("button", { name: "Reactivate" }),
    ).toBeVisible();
    await modsPage.getByRole("button", { name: "Reactivate" }).click();

    await expect(modListing).toContainText("version 1.0.1");
  });
});
