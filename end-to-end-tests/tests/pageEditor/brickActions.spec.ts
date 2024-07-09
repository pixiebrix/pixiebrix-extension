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

const testModDefinitionName = "brick-actions";
test.use({ modDefinitionNames: [testModDefinitionName] });
test("brick actions panel behavior", async ({
  page,
  extensionId,
  modDefinitionsMap,
  newPageEditorPage,
  verifyModDefinitionSnapshot,
}) => {
  const { id: modId } = modDefinitionsMap[testModDefinitionName];
  const modActivationPage = new ActivateModPage(page, extensionId, modId);
  await modActivationPage.goto();
  await modActivationPage.clickActivateAndWaitForModsPageRedirect();

  await page.goto("/");
  const pageEditorPage = await newPageEditorPage(page.url());

  const modListItem =
    pageEditorPage.modListingPanel.getModListItemByName("Mod Actions Test");
  await modListItem.activate();

  await expect(pageEditorPage.brickActionsPanel.root).toBeHidden();

  const testStarterBrick = pageEditorPage.modListingPanel.getModStarterBrick(
    "Mod Actions Test",
    "Button",
  );
  await testStarterBrick.activate();
  await expect(pageEditorPage.brickActionsPanel.root).toBeVisible();

  await pageEditorPage.brickActionsPanel.addBrick("Set Mod Variable", {
    index: 1,
  });
  await pageEditorPage.saveActiveMod();
  await verifyModDefinitionSnapshot({ modId, snapshotName: "brick-added" });

  // await page2
  //   .getByTestId("editor-node-layout")
  //   .locator("div")
  //   .filter({ hasText: "Custom modal 123@form" })
  //   .nth(1)
  //   .click();
  // await page2.getByTestId("icon-button-removeNode").click();
  // await page2.getByLabel("Button - Save").click();
  // await page2.getByRole("button", { name: "Save" }).click();
  // await page2
  //   .getByTestId("editor-node-layout")
  //   .locator("div")
  //   .filter({ hasText: "Alert Brick" })
  //   .nth(1)
  //   .click();
  // await page2.getByTestId("icon-button-copyNode").click();
  // await page2
  //   .getByTestId("icon-button-d666ebbc-a5a4-41d0-a8b1-5316509c448e-paste-brick")
  //   .click();
  // await page2.getByTestId("icon-button-copyNode").click();
  // await page2.getByTestId("icon-button-foundation-paste-brick").click();
  // await page2.getByLabel("Button - Save").click();
  // await page2.getByRole("button", { name: "Save" }).click();
  // await page2.getByRole("button", { name: "Move brick higher" }).nth(3).click();
  // await page2.getByRole("button", { name: "Move brick lower" }).first().click();
  // await page2.getByLabel("Button - Save").click();
  // await page2.getByRole("button", { name: "Save" }).click();
});
