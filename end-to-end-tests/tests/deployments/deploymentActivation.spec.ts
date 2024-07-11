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

import { expect } from "@playwright/test";
import { test } from "../../fixtures/testBase";
import { ModsPage } from "../../pageObjects/extensionConsole/modsPage";

test.use({ profileName: "affiliated" });

test("activate a deployed mod in the extension console", async ({
  page,
  extensionId,
}) => {
  const modsPage = new ModsPage(page, extensionId);
  await modsPage.goto();
  const deployedMod = modsPage.modTableItemById(
    "@affiliated-test-team/my-pbxvercelapp-trigger",
  );

  await test.step("Deactivate the deployed mod", async () => {
    await deployedMod.clickAction("Deactivate");
    await expect(deployedMod.root).toBeHidden();
  });

  await test.step("Reactivate the deployed mod via deployment modal", async () => {
    await page.reload();
    // Wait for the page to finish loading.
    await expect(
      page.getByText("Welcome to PixieBrix! Ready to get started?"),
    ).toBeVisible();

    const activateDeploymentModal = page.getByTestId("activateDeploymentModal");
    await expect(activateDeploymentModal).toBeVisible();
    await activateDeploymentModal
      .getByRole("button", { name: "Activate" })
      .click();

    await expect(deployedMod.getByText("version 1.0.0")).toBeVisible();

    // Expect the same mod to be shown on the affiliated team tab
    await page.getByTestId("affiliated-test-team-mod-tab").click();
    await expect(deployedMod.getByText("version 1.0.0")).toBeVisible();
  });
});
