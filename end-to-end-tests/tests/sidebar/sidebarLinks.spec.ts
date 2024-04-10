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
import { getSidebarPage } from "../../utils";

test("8206: clicking links doesn't crash browser", async ({
  page,
  extensionId,
}) => {
  const modId = "@pixies/test/sidebar-links";

  const modActivationPage = new ActivateModPage(page, extensionId, modId);
  await modActivationPage.goto();

  await modActivationPage.clickActivateAndWaitForModsPageRedirect();

  await page.goto("/");

  // The mod contains a trigger to open the sidebar on h1
  await page.click("h1");

  const sideBarPage = await getSidebarPage(page, extensionId);
  await expect(
    sideBarPage.getByRole("heading", { name: "Sidebar Links" }),
  ).toBeVisible();

  await sideBarPage.getByTitle("Open Extension Console").click();

  await sideBarPage.getByRole("link", { name: "Markdown Text Link" }).click();

  // Is a react-bootstrap button link variant
  await sideBarPage.getByRole("button", { name: "Open a Tab Link" }).click();

  await sideBarPage.getByRole("link", { name: "HTML Renderer Link" }).click();

  await sideBarPage.getByRole("link", { name: "Embedded Form Link" }).click();

  // FIXME: get these selectors working
  // PixieBrix uses 2 layers of frames to get around the host page CSP. Test page has 2 layers
  // const pixiebrixFrame = page.frameLocator("iframe").first();
  // const mainFrame = pixiebrixFrame.frameLocator("iframe").first();
  // await expect(mainFrame.getByText("Alpha")).toBeVisible();
  //
  // const srcdocFrame = mainFrame.frameLocator("iframe").first();
  // await srcdocFrame.getByRole("link", { name: "IFrame Link" }).click();
});
