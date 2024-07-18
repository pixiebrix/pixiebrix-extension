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

import { test, expect } from "../../../fixtures/testBase";
import { ActivateModPage } from "../../../pageObjects/extensionConsole/modsPage";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { type Page, test as base } from "@playwright/test";
import {
  getSidebarPage,
  isSidebarOpen,
  runModViaQuickBar,
} from "../../../utils";

test.describe("sidebar controller", () => {
  test("can open sidebar immediately from iframe without focus dialog", async ({
    page,
    extensionId,
  }) => {
    const modId = "@pixies/test/frame-sidebar-actions";

    const modActivationPage = new ActivateModPage(page, extensionId, modId);
    await modActivationPage.goto();
    await modActivationPage.clickActivateAndWaitForModsPageRedirect();

    await page.goto("/frames-builder.html");

    const frame = page.frameLocator("iframe");
    await frame.getByRole("link", { name: "Show Sidebar Immediately" }).click();

    // Don't use getSidebarPage because it automatically clicks the MV3 focus dialog.
    await expect(() => {
      expect(isSidebarOpen(page, extensionId)).toBe(false);
    }).toPass({ timeout: 5000 });
  });

  test("shows focus dialog in top-level frame", async ({
    page,
    extensionId,
  }) => {
    const modId = "@pixies/test/frame-sidebar-actions";

    const modActivationPage = new ActivateModPage(page, extensionId, modId);
    await modActivationPage.goto();
    await modActivationPage.clickActivateAndWaitForModsPageRedirect();

    await page.goto("/frames-builder.html");

    const frame = page.frameLocator("iframe");

    // Mod waits 7.5 seconds before running Show Sidebar brick to ensure the user gesture dialog is shown
    await frame.getByRole("link", { name: "Show Sidebar after Wait" }).click();
    // eslint-disable-next-line playwright/no-wait-for-timeout -- match wait in the mod
    await page.waitForTimeout(8000);

    // Focus dialog should be visible in the top-level frame
    await expect(
      page.getByRole("button", { name: "Open Sidebar" }),
    ).toBeVisible();

    // The focus dialog should not be shown in the iframe. Check after checking the top-level frame
    // because it's a positive check for the dialog being shown.
    await expect(
      frame.getByRole("button", { name: "Open Sidebar" }),
    ).toBeHidden();

    // Will error if page/frame not available
    await getSidebarPage(page, extensionId);
  });

  test("prevents host page styles from leaking into dialog", async ({
    extensionId,
    page,
  }) => {
    const modId = "@e2e-testing/show-sidebar-after-wait";

    const modActivationPage = new ActivateModPage(page, extensionId, modId);
    await modActivationPage.goto();
    await modActivationPage.clickActivateAndWaitForModsPageRedirect();

    await page.goto("/style-conflicts/");

    // Mod waits 7.5 seconds before running Show Sidebar brick to ensure the user gesture dialog is shown
    await runModViaQuickBar(page, "Show Sidebar after wait");
    // eslint-disable-next-line playwright/no-wait-for-timeout -- match wait in the mod
    await page.waitForTimeout(8000);

    const focusDialog = page.getByText(
      'Click "Open Sidebar" to open the mod sidebarOpen Sidebar',
    );
    await expect(focusDialog).toBeVisible();

    // One of the styles that would leak on /style-conflicts
    await expect(focusDialog).not.toHaveCSS("line-height", "5em");

    const focusDialogContainer = page.getByTestId("pixiebrix-dialog-container");
    await expect(focusDialogContainer).toHaveAttribute(
      "style",
      "all: initial;",
    );
  });
});
