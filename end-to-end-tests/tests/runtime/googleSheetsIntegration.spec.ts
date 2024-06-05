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
import { E2E_GOOGLE_TEST_USER_EMAIL } from "../../env";
import { GoogleAuthPopup } from "../../pageObjects/external/googleAuthPopup";

// eslint-disable-next-line local-rules/preferUsingStepsForLongTests -- temporary for CI
test("can activate a google spreadsheet mod with config options", async ({
  context,
  page,
  extensionId,
}) => {
  const modId = "@e2e-testing/spreadsheet-lookup";
  const modActivationPage = new ActivateModPage(page, extensionId, modId);

  // Sometimes google auth is re-prompted, so we need to handle that
  const popupPromise = context.waitForEvent("page", { timeout: 3000 });

  await modActivationPage.goto();

  // Conditionally handle the Google auth popup that prompts for account selection and access again.
  try {
    const googleAuthPopup = await popupPromise;
    const googleAuthPopupPage = new GoogleAuthPopup(googleAuthPopup);
    await googleAuthPopupPage.chooseAccountAndAllowAccess();
    await page
      .getByRole("button", { name: "Refresh integration" })
      .click({ timeout: 3000 });
    // eslint-disable-next-line playwright/no-wait-for-timeout -- Timeout for debugging in CI
    await page.waitForTimeout(2000);
    const googleIntegrationSelector = page.getByTestId(
      "integration-auth-selector-integrationDependencies.0.configId",
    );
    await googleIntegrationSelector
      .getByRole("combobox")
      .click({ timeout: 3000 });
    await page.reload();
  } catch (error) {
    // eslint-disable-next-line playwright/no-conditional-in-test -- we need to handle the timeout error
    if (error instanceof Error && error.message.includes("Timeout")) {
      // No google auth popup was shown, continue
    } else {
      throw error;
    }
  }

  const googleIntegrationSelector = page.getByTestId(
    "integration-auth-selector-integrationDependencies.0.configId",
  );
  await googleIntegrationSelector
    .getByRole("combobox")
    .click({ timeout: 3000 });

  await page
    .getByRole("option", { name: `${E2E_GOOGLE_TEST_USER_EMAIL} —` })
    .click({ timeout: 3000 });

  await expect(googleIntegrationSelector).toContainText(
    `${E2E_GOOGLE_TEST_USER_EMAIL} — Private`,
  );

  await expect(page.getByLabel("testSheet")).toBeVisible();
  await page.getByLabel("testSheet").click();
  await page.getByRole("option", { name: "Test sheet" }).click();

  await modActivationPage.clickActivateAndWaitForModsPageRedirect();

  await page.goto("/bootstrap-5");
  await expect(page.getByText("test cell value")).toBeVisible();
});
