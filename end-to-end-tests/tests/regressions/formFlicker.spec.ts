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

import { getSidebarPage, runModViaQuickBar } from "../../utils";
import { test, expect } from "../../fixtures/testBase";
import { ActivateModPage } from "../../pageObjects/extensionConsole/modsPage";

// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { type Page, test as base } from "@playwright/test";

test.describe("forms flickering due to components unexpectedly unmounting/remounting", () => {
  test("#8320: Search field loses focus while typing on snippet mod", async ({
    page,
    extensionId,
  }) => {
    const modId = "@e2e-testing/no-ai-snippet-manager-db";

    const modActivationPage = new ActivateModPage(page, extensionId, modId);
    await modActivationPage.goto();

    await expect(
      page.getByText("[Testing] No AI Snippet Template Manager", {
        exact: true,
      }),
    ).toBeVisible();
    await modActivationPage.clickActivateAndWaitForModsPageRedirect();

    await page.goto("/bootstrap-5");

    await runModViaQuickBar(page, "Open Sidebar");

    const sideBarPage = await getSidebarPage(page, extensionId);

    await expect(sideBarPage.getByTestId("container").nth(1)).toContainText(
      "Welcome to the Snippet Manager!",
    );

    const input = sideBarPage.getByPlaceholder("Search snippets");
    await input.click();
    // Add delay to give time for the the input to lose focus
    await input.pressSequentially("lor", { delay: 100 });

    // Validate that the input value was set correctly
    await expect(input).toHaveValue("lor");

    // Verify that the input value filtered the list
    await expect(sideBarPage.getByTestId("container").nth(1)).toContainText(
      "Lorem ipsum dolor sit amet, ",
    );
  });
});
