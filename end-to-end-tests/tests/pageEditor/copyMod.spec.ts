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

import { expect, test } from "../../fixtures/testBase";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { test as base } from "@playwright/test";
import { ActivateModPage } from "../../pageObjects/extensionConsole/modsPage";
import { uuidv4 } from "@/types/helpers";
import { type Serializable } from "playwright-core/types/structs";
import path from "node:path";
import { FloatingActionButton } from "end-to-end-tests/pageObjects/floatingActionButton";
import { getSidebarPage, runModViaQuickBar } from "end-to-end-tests/utils";
import { VALID_UUID_REGEX } from "@/types/stringTypes";

test("copying a mod that uses the PixieBrix API is copied correctly", async ({
  page,
  newPageEditorPage,
  extensionId,
  verifyModDefinitionSnapshot,
}) => {
  const modId = "@e2e-testing/test/write-to-db-static";
  const modName = "Write to Hard-Coded DB";
  const modUuid = uuidv4();
  const copyModId = `@extension-e2e-test-unaffiliated/write-to-hard-coded-db-${modUuid}`;

  await test.step("Activate the mod to be copied", async () => {
    const modActivationPage = new ActivateModPage(page, extensionId, modId);
    await modActivationPage.goto();
    await modActivationPage.clickActivateAndWaitForModsPageRedirect();

    await verifyModDefinitionSnapshot({
      modId,
      snapshotName: "write-to-db-static-origin",
      mode: "current",
    });
  });

  await test.step("Copy the mod", async () => {
    await page.goto("/");
    const pageEditorPage = await newPageEditorPage(page.url());
    await pageEditorPage.copyMod(modName, modUuid);

    await expect(
      pageEditorPage.getByRole("textbox", { name: "Mod ID" }),
    ).toHaveValue(copyModId);

    await expect(
      pageEditorPage.getByRole("textbox", { name: "Name" }),
    ).toHaveValue(`${modName} (Copy)`);

    await verifyModDefinitionSnapshot({
      modId: copyModId,
      snapshotName: "write-to-db-static-copy",
      mode: "diff",
      prevModId: modId,
    });
  });
});

test("run a copied mod with a built-in integration", async ({
  page,
  extensionId,
  context,
  newPageEditorPage,
  verifyModDefinitionSnapshot,
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
  const modName = "GIPHY Search";
  const modUuid = uuidv4();
  const copyModId = `@extension-e2e-test-unaffiliated/giphy-search-${modUuid}`;

  await test.step("Activate the mod to be copied", async () => {
    const modActivationPage = new ActivateModPage(page, extensionId, modId);
    await modActivationPage.goto();
    await modActivationPage.clickActivateAndWaitForModsPageRedirect();

    await verifyModDefinitionSnapshot({
      modId,
      snapshotName: "giphy-search-origin",
      mode: "current",
    });
  });

  await page.goto("/");
  const pageEditorPage = await newPageEditorPage(page.url());
  await test.step("Copy the mod", async () => {
    await pageEditorPage.copyMod(modName, modUuid);

    await expect(
      pageEditorPage.getByRole("textbox", { name: "Mod ID" }),
    ).toHaveValue(copyModId);

    await expect(
      pageEditorPage.getByRole("textbox", { name: "Name" }),
    ).toHaveValue(`${modName} (Copy)`);

    await verifyModDefinitionSnapshot({
      modId: copyModId,
      snapshotName: "giphy-search-copy",
      mode: "diff",
      prevModId: modId,
    });
  });

  await test.step("Deactivate the original mod", async () => {
    await pageEditorPage.deactivateMod(modName);
  });

  await test.step("Run the copied mod", async () => {
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
});
