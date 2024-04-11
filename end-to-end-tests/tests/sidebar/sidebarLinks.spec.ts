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
import { type Page, test as base } from "@playwright/test";
import { getSidebarPage } from "../../utils";

async function openSidebar(page: Page, extensionId: string) {
  // The mod contains a trigger to open the sidebar on h1. If the sidePanel is already open, it's a NOP
  await page.click("h1");

  return getSidebarPage(page, extensionId);
}

test("8206: clicking links doesn't crash browser", async ({
  page,
  extensionId,
}) => {
  const modId = "@pixies/test/sidebar-links";

  const modActivationPage = new ActivateModPage(page, extensionId, modId);
  await modActivationPage.goto();

  await modActivationPage.clickActivateAndWaitForModsPageRedirect();

  await page.goto("/");

  let sideBarPage = await openSidebar(page, extensionId);

  await expect(
    sideBarPage.getByRole("heading", { name: "Sidebar Links" }),
  ).toBeVisible();

  await sideBarPage.getByTitle("Open Extension Console").click();

  // On MS Edge, opening a new tab closes the sidebar, so we have to re-open it on the page after clicking each link
  // See https://github.com/w3c/webextensions/issues/588. Alternatively, it might work to change the
  // openAllLinksInPopups behavior to open in a new window instead of a new tab.
  sideBarPage = await openSidebar(page, extensionId);

  await sideBarPage.getByRole("link", { name: "Markdown Text Link" }).click();

  sideBarPage = await openSidebar(page, extensionId);

  // Is a react-bootstrap button link variant
  await sideBarPage.getByRole("button", { name: "Open a Tab Link" }).click();

  sideBarPage = await openSidebar(page, extensionId);

  await sideBarPage.getByRole("link", { name: "HTML Renderer Link" }).click();

  sideBarPage = await openSidebar(page, extensionId);

  await sideBarPage.getByRole("link", { name: "Embedded Form Link" }).click();

  // TODO: get these selectors working. Also, clicking link in IFrame will crash MS Edge until we fix the issue:
  //   - https://github.com/pixiebrix/pixiebrix-extension/pull/8223
  //   - https://github.com/pixiebrix/pixiebrix-extension/pull/8224
  // PixieBrix uses 2 layers of frames to get around the host page CSP. Test page has 2 layers
  // const pixiebrixFrame = sideBarPage.frameLocator("iframe").first();
  // const mainFrame = pixiebrixFrame.frameLocator("iframe").first();
  // await expect(mainFrame.getByText("Alpha")).toBeVisible();
  //
  // const srcdocFrame = mainFrame.frameLocator("iframe").first();
  // await srcdocFrame.getByRole("link", { name: "IFrame Link" }).click();
});
