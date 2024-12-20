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
import { ActivateModPage } from "../../pageObjects/extensionConsole/modsPage";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { type Page, test as base } from "@playwright/test";
import {
  getSidebarPage,
  clickAndWaitForNewPage,
  runModViaQuickBar,
  getBrowserOs,
  isChrome,
} from "../../utils";
import path from "node:path";
import { VALID_UUID_REGEX } from "@/types/stringTypes";
import { type Serializable } from "playwright-core/types/structs";
import { SERVICE_URL } from "../../env";
import { ExtensionsShortcutsPage } from "../../pageObjects/extensionsShortcutsPage";
import { FloatingActionButton } from "../../pageObjects/floatingActionButton";
import { DEFAULT_TIMEOUT } from "../../../playwright.config";

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
        path: path.join(
          __dirname,
          "../../fixtures/responses/giphy-search.json",
        ),
      });
    }

    return route.continue();
  });

  const modId = "@e2e-testing/giphy/giphy-search";
  const modActivationPage = new ActivateModPage(page, extensionId, modId);
  await modActivationPage.goto();

  await expect(
    modActivationPage
      .locator(".form-group")
      .filter({ hasText: /^GIPHY — ✨ Built-in$/ }),
  ).toBeVisible();
  await modActivationPage.clickActivateAndWaitForModsPageRedirect();
  await page.goto("/");

  const floatingActionButton = new FloatingActionButton(page);
  const button = await floatingActionButton.getActionButton();

  // Ensure the QuickBar is ready
  await expect(button).toBeVisible();

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

test("validates activating a mod with required integrations", async ({
  page,
  extensionId,
}) => {
  const modId = "@e2e-testing/summarize-text-open-ai";
  const modActivationPage = new ActivateModPage(page, extensionId, modId);
  await modActivationPage.goto();

  await expect(
    modActivationPage.getByRole("heading", { name: "Activate Summarize Text" }),
  ).toBeVisible();
  await modActivationPage.clickActivateAndViewValidationError(
    "Please select a configuration",
  );
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

  await expect(sideBarPage.getByTestId("card").getByText(note)).toBeVisible();

  // Wrapped in a toPass block in case the delete button isn't clicked successfully due to page shifting
  await expect(async () => {
    // Get the correct container element, as the note text and delete button are wrapped in a div
    await sideBarPage
      .getByText(`${note} Delete Note`)
      .getByRole("button", { name: "Delete Note" })
      .click();

    await expect(sideBarPage.getByTestId("card").getByText(note)).toBeHidden({
      timeout: 5000,
    });
  }).toPass({ timeout: DEFAULT_TIMEOUT });
});

test("activating a mod when the quickbar shortcut is not configured", async ({
  context,
  page: firstTab,
  extensionId,
  chromiumChannel,
}) => {
  const shortcutsPage = new ExtensionsShortcutsPage(firstTab, chromiumChannel);
  await shortcutsPage.goto();

  await test.step("Clear the quickbar shortcut before activating a quickbar mod", async () => {
    const os = await getBrowserOs(firstTab);
    // See https://github.com/pixiebrix/pixiebrix-extension/issues/6268
    /* eslint-disable playwright/no-conditional-in-test -- Existing bug where shortcut isn't set on Edge in Windows/Linux */
    if (os === "MacOS" || isChrome(chromiumChannel)) {
      await shortcutsPage.clearQuickbarShortcut();
    }
  });
  /* eslint-enable playwright/no-conditional-in-test */

  let modActivationPage: ActivateModPage;
  const secondTab = await context.newPage();
  await test.step("Begin activation of a mod with a quickbar shortcut", async () => {
    const modId = "@e2e-testing/show-alert";
    modActivationPage = new ActivateModPage(secondTab, extensionId, modId);
    await modActivationPage.goto();
  });

  await test.step("Verify the mod activation page has links for setting the shortcut", async () => {
    await expect(
      modActivationPage.keyboardShortcutDocumentationLink,
    ).toBeVisible();
    await modActivationPage.keyboardShortcutDocumentationLink.click();

    await expect(
      secondTab.getByRole("heading", { name: "Changing the Quick Bar" }),
    ).toBeVisible();
    await secondTab.goBack();

    await expect(modActivationPage.configureQuickbarShortcutLink).toBeVisible();

    const configureShortcutPage = await clickAndWaitForNewPage(
      modActivationPage.configureQuickbarShortcutLink,
      context,
    );

    await expect(configureShortcutPage).toHaveURL(shortcutsPage.pageUrl);
    await configureShortcutPage.close();
  });

  await test.step("Restore the shortcut and activate the mod", async () => {
    await shortcutsPage.setQuickbarShortcut();

    await modActivationPage.clickActivateAndWaitForModsPageRedirect();
  });

  await test.step("Verify the mod is activated and works as expected", async () => {
    await firstTab.bringToFront();
    await firstTab.goto("/");

    await runModViaQuickBar(firstTab, "Show Alert");
    await expect(firstTab.getByText("Quick Bar Action ran")).toBeVisible();
  });
});

test("can activate a mod via url", async ({
  page,
  context,
  extensionId,
  chromiumChannel,
}) => {
  const modId = "@e2e-testing/show-alert";
  const modIdUrlEncoded = encodeURIComponent(modId);
  const activationLink = `${SERVICE_URL}/activate?id=${modIdUrlEncoded}`;

  let activationPage: Page | undefined = page;
  await activationPage.goto(activationLink);

  // Browsers sometimes throw this error if we use `waitForURL` for this redirect behavior:
  // "Error: page.waitForURL: net::ERR_ABORTED; maybe frame was detached?"
  // This is a workaround to ensure a page is loaded with the expected URL
  await expect(() => {
    activationPage = context
      .pages()
      .find(
        (page) =>
          page.url() ===
          `chrome-extension://${extensionId}/options.html#/marketplace/activate/${modIdUrlEncoded}`,
      );

    if (!activationPage) {
      throw new Error("Extension console page not found");
    }
  }).toPass({ timeout: 20_000 });

  await expect(activationPage.getByRole("code")).toContainText(modId);

  const modActivationPage = new ActivateModPage(
    activationPage,
    extensionId,
    modId,
  );
  await modActivationPage.clickActivateAndWaitForModsPageRedirect();

  await activationPage.goto("/");

  await runModViaQuickBar(activationPage, "Show Alert");
  await expect(activationPage.getByText("Quick Bar Action ran")).toBeVisible();
});
