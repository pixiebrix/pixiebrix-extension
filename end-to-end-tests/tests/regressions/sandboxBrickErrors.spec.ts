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
import { type Page, test as base } from "@playwright/test";

test("#8821: ensure Javascript script errors are thrown during brick runtime", async ({
  page,
  extensionId,
  newPageEditorPage,
}) => {
  const modId = "@e2e-testing/8821-repro";
  const modActivationPage = new ActivateModPage(page, extensionId, modId);
  await modActivationPage.goto();
  await modActivationPage.clickActivateAndWaitForModsPageRedirect();

  await page.goto("/bootstrap-5");
  const pageEditorPage = await newPageEditorPage(page);
  await pageEditorPage.modListingPanel
    .getModListItemByName("8821 Repro")
    .click();

  await pageEditorPage.modListingPanel
    .getModStarterBrick("8821 Repro", "8821 Repro")
    .select();

  await pageEditorPage.brickActionsPanel
    .getBrickByName("Run JavaScript Function")
    .click();

  await pageEditorPage.getByText("Run Trigger").click();
  await expect(
    pageEditorPage.getByText(
      "Error running user-defined JavaScript. Test error.",
    ),
  ).toBeVisible();
});
