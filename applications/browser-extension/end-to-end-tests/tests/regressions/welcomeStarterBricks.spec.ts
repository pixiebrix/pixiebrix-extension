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
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { test as base } from "@playwright/test";
import { ActivateModPage } from "../../pageObjects/extensionConsole/modsPage";
import {
  getSidebarPage,
  runModViaQuickBar,
  isMsEdge,
  PRE_RELEASE_BROWSER_WORKFLOW_NAME,
} from "../../utils";

test("#8740: can view the starter mods on the pixiebrix.com/welcome page", async ({
  page,
  extensionId,
  chromiumChannel,
}) => {
  test.fixme(
    process.env.GITHUB_WORKFLOW === PRE_RELEASE_BROWSER_WORKFLOW_NAME &&
      isMsEdge(chromiumChannel),
    "Skipping test for MS Edge in pre-release workflow, see https://github.com/pixiebrix/pixiebrix-extension/issues/9125",
  );

  const modId = "@e2e-testing/open-sidebar-via-quickbar";
  const modActivationPage = new ActivateModPage(page, extensionId, modId);
  await modActivationPage.goto();
  await modActivationPage.clickActivateAndWaitForModsPageRedirect();

  await page.goto("https://pixiebrix.com/welcome", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await runModViaQuickBar(page, "Open Sidebar");

  const sideBarPage = await getSidebarPage(page, extensionId);

  try {
    await expect(sideBarPage.getByRole("tab", { name: "Mods" })).toBeVisible();
  } catch {
    // There seems to be a race condition where a welcome mod is already loaded, which will then hide the Mod launcher tab
    // If this happens, we can open the mod launcher tab directly
    await sideBarPage.getByLabel("Open Mod Launcher").click();
    // eslint-disable-next-line playwright/no-conditional-expect -- see above comment
    await expect(sideBarPage.getByRole("tab", { name: "Mods" })).toBeVisible();
  }

  await expect(
    sideBarPage.locator(".list-group").getByRole("heading").first(),
  ).not.toBeEmpty();
});
