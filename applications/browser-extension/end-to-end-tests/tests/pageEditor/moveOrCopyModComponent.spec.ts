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
import { uuidv4 } from "@/types/helpers";

// Since 2.1.4, new mods are created with the name "New Mod" instead of being a standalone mod component
const DEFAULT_MOD_NAME = "New Mod";

test("Create new mod by moving mod component", async ({
  page,
  newPageEditorPage,
}) => {
  await page.goto("/");
  const pageEditorPage = await newPageEditorPage(page.url());

  await test.step("Add new starter bricks", async () => {
    // Add 2x mod components because the last mod component in a mod can't be moved
    await pageEditorPage.modListingPanel.addNewMod({
      starterBrickName: "Context Menu",
    });

    const modListItem =
      pageEditorPage.modListingPanel.getModListItemByName(DEFAULT_MOD_NAME);
    const modActionMenu = await modListItem.openModActionMenu();
    await modActionMenu.addStarterBrick("Trigger");
  });

  const modComponentName = await pageEditorPage.brickConfigurationPanel
    .getByRole("textbox", {
      name: "Name",
    })
    .inputValue();

  await expect(
    pageEditorPage.modListingPanel.getModListItemLocatorByName(
      DEFAULT_MOD_NAME,
    ),
  ).toBeVisible();

  const modName = `Destination Mod ${uuidv4()}`;

  await pageEditorPage.moveModComponentToNewMod({
    sourceModComponentName: modComponentName,
    destinationModName: modName,
  });

  await expect(pageEditorPage.getByText(modName)).toBeVisible();
  await expect(pageEditorPage.getByText(modComponentName)).toBeVisible();

  // Will still be visible because only one of its mod components was moved
  await expect(
    pageEditorPage.locator("span").filter({ hasText: DEFAULT_MOD_NAME }),
  ).toBeVisible();
});

test("Create new mod by copying a mod component", async ({
  page,
  newPageEditorPage,
}) => {
  await page.goto("/");
  const pageEditorPage = await newPageEditorPage(page.url());

  await test.step("Add new Trigger starter brick", async () => {
    const { modComponentNameMatcher } =
      await pageEditorPage.modListingPanel.addNewMod({
        starterBrickName: "Trigger",
      });

    await expect(
      pageEditorPage.brickConfigurationPanel.getByRole("textbox", {
        name: "Name",
      }),
    ).toHaveValue(modComponentNameMatcher);
  });

  const modComponentName = await pageEditorPage.brickConfigurationPanel
    .getByRole("textbox", {
      name: "Name",
    })
    .inputValue();

  await expect(
    pageEditorPage.modListingPanel.getModListItemLocatorByName(
      DEFAULT_MOD_NAME,
    ),
  ).toBeVisible();

  const modName = `Destination Mod ${uuidv4()}`;

  await pageEditorPage.copyModComponentToNewMod({
    sourceModComponentName: modComponentName,
    destinationModName: modName,
  });

  // Use span locator to distinguish from the New Mod button
  await expect(
    pageEditorPage.locator("span").filter({ hasText: DEFAULT_MOD_NAME }),
  ).toBeVisible();
  await expect(pageEditorPage.getByText(modName)).toBeVisible();
  await expect(pageEditorPage.getByText(modComponentName)).toHaveCount(2);
});
