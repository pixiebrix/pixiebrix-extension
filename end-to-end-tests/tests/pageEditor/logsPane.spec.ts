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
import { ActivateModPage } from "../../pageObjects/extensionConsole/modsPage";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { test as base } from "@playwright/test";

test("can view error logs", async ({
  page,
  extensionId,
  newPageEditorPage,
}) => {
  const modId = "@e2e-testing/error-trigger";
  const modName = "Error trigger";
  const modActivationPage = new ActivateModPage(page, extensionId, modId);

  await modActivationPage.goto();
  await modActivationPage.clickActivateAndWaitForModsPageRedirect();

  await page.goto("/");

  const pageEditorPage = await newPageEditorPage(page.url());
  await pageEditorPage.modListingPanel.getModListItemByName(modName).click();
  await pageEditorPage.modEditorPane.logsTab.click();
  const logsTabPane = await pageEditorPage.modEditorPane.getLogsTabPanel();
  const logs = await logsTabPane.getLogsTableRows();
  expect(logs).toHaveLength(1);

  const log = logs[0]!;
  await expect(log.timestamp).toBeVisible();
  await expect(log.level).toHaveText("ERROR");
  await expect(log.label).toHaveText("Raise business error");
  await expect(log.brickId).toHaveText("@pixiebrix/error");
  await expect(log.message).toHaveText("Test error");
});
