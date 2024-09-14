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
import { type Frame, type Page, test as base } from "@playwright/test";
import { getSidebarPage } from "../../../utils";

test.describe("Mod Variable Sync", () => {
  test("session variable cross-tab sync", async ({ page, extensionId }) => {
    await test.step("activate mod", async () => {
      const modId = "@e2e-testing/state-sync";
      const modActivationPage = new ActivateModPage(page, extensionId, modId);
      await modActivationPage.goto();
      await modActivationPage.clickActivateAndWaitForModsPageRedirect();

      await page.goto("/frames-builder.html");
    });

    // Waiting for the mod to be ready before opening sidebar
    await expect(page.getByText("Local: 0")).toBeVisible();

    // The mod contains a trigger to open the sidebar on h1
    await page.click("h1");
    const sideBarPage = await getSidebarPage(page, extensionId);
    await expect(
      sideBarPage.getByRole("heading", { name: "State Sync Demo" }),
    ).toBeVisible();

    await test.step("verify same tab increment", async () => {
      await sideBarPage.getByRole("button", { name: "Increment" }).click();

      await expect(sideBarPage.getByText("Sync: 1")).toBeVisible();
      await expect(sideBarPage.getByText("Local: 1")).toBeVisible();

      await expect(page.getByText("Sync: 1")).toBeVisible();
      await expect(page.getByText("Local: 1")).toBeVisible();

      const frameLocator = page.frameLocator("iframe");
      await expect(frameLocator.getByText("Sync: 1")).toBeVisible();
      await expect(frameLocator.getByText("Local: 0")).toBeVisible();
    });

    // Close the sidebar, because getSidebarPage currently can't distinguish between multiple sidebars
    await sideBarPage.getByRole("button", { name: "Close" }).click();
    await sideBarPage.getByRole("button", { name: "Close" }).click();

    const otherPage = await page.context().newPage();
    await otherPage.goto(page.url());

    // Waiting for the mod to be ready before opening sidebar
    await expect(otherPage.getByText("Local: 0")).toBeVisible();

    await otherPage.click("h1");
    const otherSideBarPage = await getSidebarPage(otherPage, extensionId);
    await expect(
      otherSideBarPage.getByRole("heading", { name: "State Sync Demo" }),
    ).toBeVisible();

    await test.step("verify cross tab increment", async () => {
      // Should be available on first run of the panel
      await expect(otherSideBarPage.getByText("Sync: 1")).toBeVisible();
      await expect(otherSideBarPage.getByText("Local: ")).toBeVisible();

      await otherSideBarPage.getByRole("button", { name: "Increment" }).click();

      await expect(otherSideBarPage.getByText("Sync: 2")).toBeVisible();
      await expect(otherSideBarPage.getByText("Local: 1")).toBeVisible();

      // Should automatically sync to the original tab
      await expect(page.getByText("Sync: 2")).toBeVisible();
      await expect(page.getByText("Local: 1")).toBeVisible();

      const frameLocator = page.frameLocator("iframe");
      await expect(frameLocator.getByText("Sync: 2")).toBeVisible();
      // Local variable doesn't exist in the frame
      await expect(frameLocator.getByText("Local: 0")).toBeVisible();
    });
  });
});
