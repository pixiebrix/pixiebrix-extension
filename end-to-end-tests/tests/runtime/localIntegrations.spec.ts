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
import { LocalIntegrationsPage } from "../../pageObjects/extensionConsole/localIntegrationsPage";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { test as base } from "@playwright/test";

test.describe("Local Integrations Page", () => {
  test("#8067: blank numeric text integration configuration field validated on save", async ({
    page,
    extensionId,
  }) => {
    const localIntegrationsPage = new LocalIntegrationsPage(page, extensionId);
    await localIntegrationsPage.goto();

    await localIntegrationsPage.createNewIntegration(
      "Automation Anywhere Control Room",
    );

    await page.getByLabel("Label").fill("AA Control Room");

    await page
      .getByTestId("toggle-config.folderId")
      .getByRole("button")
      .click();
    await page.getByTestId("string").click();

    await page.keyboard.press("Tab");

    // Verify that the numeric text field is validated
    await expect(
      page.getByText("String does not match pattern."),
    ).toBeVisible();

    // Verify that the other fields are also validated
    await page.getByLabel("Control Room URL").click();
    await page.keyboard.press("Tab");
    await expect(
      page.getByText('String does not match format "uri".'),
    ).toBeVisible();

    await page.keyboard.press("Tab");
    await expect(page.getByText("username is a required field")).toBeVisible();
  });
});
