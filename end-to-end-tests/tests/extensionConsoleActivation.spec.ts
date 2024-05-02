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
import { ensureVisibility, getSidebarPage, runModViaQuickBar } from "../utils";
import path from "node:path";
import { VALID_UUID_REGEX } from "@/types/stringTypes";
import { type Serializable } from "playwright-core/types/structs";
import { MV } from "../env";

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
  test.skip(MV === "2", "Service worker request mocking only available in MV3");

  const modId = "@pixies/giphy/giphy-search";

  let giphyRequestPostData: Serializable;
  // The giphy search request is proxied through the PixieBrix server, which is kicked off in the background/service
  // worker. Playwright experimentally supports mocking service worker requests, see
  // https://playwright.dev/docs/service-workers-experimental#routing-service-worker-requests-only
  await context.route("https://app.pixiebrix.com/api/proxy/", async (route) => {
    if (route.request().serviceWorker()) {
      // Ensure the mod was properly activated with the built-in integration configuration
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Serializable is any
      giphyRequestPostData = route.request().postDataJSON();

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

  // Ensure the QuickBar is ready
  await expect(
    page.getByRole("button", { name: "open the PixieBrix quick bar" }),
  ).toBeVisible();

  await runModViaQuickBar(page, "GIPHY Search");

  // Search for "kitten" keyword
  const giphySearchModal = page.frameLocator('iframe[title="Modal content"]');
  await giphySearchModal.getByLabel("Search Query*").fill("kitten");
  await giphySearchModal.getByRole("button", { name: "Search" }).click();

  // Ensure the sidebar mod is working properly
  const sidebarPage = await getSidebarPage(page, extensionId);
  await expect(
    sidebarPage.getByRole("heading", { name: 'GIPHY Results for "kitten"' }),
  ).toBeVisible();
  expect(giphyRequestPostData).toMatchObject({
    url: "https://api.giphy.com/v1/gifs/search",
    auth_id: expect.stringMatching(VALID_UUID_REGEX),
    service_id: "@pixies/giphy/giphy-service",
  });
});

test("can activate a mod with a database", async ({ page, extensionId }) => {
  const modId = "@e2e-testing/shared-notes-sidebar";
  const note = `This is a test note ${Date.now()}`;

  const modActivationPage = new ActivateModPage(page, extensionId, modId);
  await modActivationPage.goto();

  await modActivationPage.clickActivateAndWaitForModsPageRedirect();

  await page.goto("/");

  await runModViaQuickBar(page, "Open Sidebar");
  const sideBarPage = await getSidebarPage(page, extensionId);

  await sideBarPage.getByRole("button", { name: "Add note" }).click();

  await sideBarPage.frameLocator("iframe").getByLabel("Note*").fill(note);

  await sideBarPage
    .frameLocator("iframe")
    .getByRole("button", { name: "Submit" })
    .click();

  // TODO: Remove when the sidebar is reloaded automatically
  // See: https://github.com/pixiebrix/pixiebrix-extension/issues/8376
  await ensureVisibility(
    sideBarPage.getByRole("button", { name: "Reload sidebar (button only" }),
  );
  await sideBarPage
    .getByRole("button", { name: "Reload sidebar (button only" })
    .click();

  // NOTE: There should only be one card, but if the test ever fails before cleanup, there could be more
  await expect(sideBarPage.getByTestId("card").last()).toContainText(note);

  await sideBarPage.getByRole("button", { name: "Delete Notes" }).click();

  // TODO: Remove when the sidebar is reloaded automatically
  // See: https://github.com/pixiebrix/pixiebrix-extension/issues/8376
  await sideBarPage
    .getByRole("button", { name: "Reload sidebar (button only" })
    .click();

  await expect(sideBarPage.getByTestId("card")).toBeHidden();
});
