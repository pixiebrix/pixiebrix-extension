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

import { test, expect } from "../fixtures/extensionBase";
import { ActivateModPage } from "../pageObjects/extensionConsole/modsPage";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { test as base } from "@playwright/test";
import { getSidebarPage } from "../utils";
import path from "node:path";

test("can activate a mod with no config options", async ({
  page,
  extensionId,
}) => {
  const modId = "@pixies/highlight-keywords";

  const modActivationPage = new ActivateModPage(page, extensionId, modId);
  await modActivationPage.goto();

  await modActivationPage.clickActivateAndWaitForModsPageRedirect();

  await page.goto("/bootstrap-5");

  const highlightedElements = await page.locator("mark").all();

  await Promise.all(
    highlightedElements.map(async (element) => {
      await expect(element).toHaveText("PixieBrix");
    }),
  );
});

test("can activate a mod with built-in integration", async ({
  page,
  extensionId,
  context,
}) => {
  const modId = "@pixies/giphy/giphy-search";

  await context.route("https://app.pixiebrix.com/api/proxy/", async (route) => {
    if (route.request().serviceWorker()) {
      return route.fulfill({
        path: path.join(__dirname, "../fixtures/responses/giphy-search.json"),
      });
    }

    return route.continue();
  });

  const modActivationPage = new ActivateModPage(page, extensionId, modId);
  await modActivationPage.goto();

  await expect(
    page.locator(".form-group").filter({ hasText: /^GIPHY — ✨ Built-in$/ }),
  ).toBeVisible();
  await modActivationPage.clickActivateAndWaitForModsPageRedirect();
  await page.goto("/");

  // Open quickbar
  await page.getByText("Index of  /").click();
  await page.keyboard.press("Meta+M");
  await page.getByRole("option", { name: "GIPHY Search" }).click();

  const giphySearchModal = page.frameLocator('iframe[title="Modal content"]');
  await giphySearchModal.getByLabel("Search Query*").fill("kitten");
  await giphySearchModal.getByRole("button", { name: "Search" }).click();

  const conditionallyPerformUserGesture = async () => {
    await expect(page.getByRole("button", { name: "OK" })).toBeVisible();
    await page.getByRole("button", { name: "OK" }).click();
    return getSidebarPage(page, extensionId);
  };

  const sidebarPage = await Promise.race([
    conditionallyPerformUserGesture(),
    getSidebarPage(page, extensionId),
  ]);

  await expect(
    sidebarPage.getByRole("heading", { name: 'GIPHY Results for "kitten"' }),
  ).toBeVisible();
});
