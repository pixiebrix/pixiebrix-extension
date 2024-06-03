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

import { test, expect } from "../../fixtures/extensionBase";
import { ActivateModPage } from "../../pageObjects/extensionConsole/modsPage";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { test as base } from "@playwright/test";
import {
  E2E_GOOGLE_TEST_USER_EMAIL,
  E2E_GOOGLE_TEST_USER_PASSWORD,
} from "../../env";

test("can activate a google spreadsheet mod with no config options", async ({
  context,
  page,
  extensionId,
}) => {
  const modId = "@e2e-testing/spreadsheet-lookup";
  const modActivationPage = new ActivateModPage(page, extensionId, modId);
  const popupPromise = context.waitForEvent("page", { timeout: 3000 });
  await modActivationPage.goto();

  // Handle Google Authentication Popup
  const popup = await popupPromise;
  await popup.waitForSelector("#identifierId");
  await popup.getByLabel("Email or Phone").fill(E2E_GOOGLE_TEST_USER_EMAIL);
  await popup.getByRole("button", { name: "Next" }).click();
  await popup
    .getByLabel("Enter your password")
    .fill(E2E_GOOGLE_TEST_USER_PASSWORD);
  await popup.getByLabel("Enter your password").press("Enter");

  // Conditionally click on Continue button if present
  try {
    const continueButton = popup.getByRole("button", { name: "Continue" });
    await continueButton.waitFor({ state: "visible", timeout: 2000 });
    await continueButton.click();
  } catch {
    // Continue button not present, do nothing
  }

  // Provide Pixiebrix access to drive resources
  await popup.getByRole("button", { name: "Allow" }).click();

  await page.getByLabel("testSheet").click();
  await page.getByRole("option", { name: "Test sheet" }).click();

  await modActivationPage.clickActivateAndWaitForModsPageRedirect();

  await page.goto("/bootstrap-5");
  await expect(page.getByText("test cell value")).toBeVisible();
});
