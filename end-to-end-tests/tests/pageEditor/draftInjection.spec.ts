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
import { type PageEditorPage } from "end-to-end-tests/pageObjects/pageEditor/pageEditorPage";
import { getSidebarPage } from "../../utils";
import { sleep } from "@/utils/timeUtils";
import { FloatingActionButton } from "end-to-end-tests/pageObjects/floatingActionButton";

test("#9381: inject non-selected/active sidebar", async ({
  page,
  extensionId,
  newPageEditorPage,
}) => {
  const modId = "@e2e-testing/ai/chatgpt-sidebar";
  let pageEditorPage: PageEditorPage;

  await test.step("Activate mod, and initialize page editor", async () => {
    const modActivationPage = new ActivateModPage(page, extensionId, modId);
    await modActivationPage.goto();
    await modActivationPage.selectIntegrationOption(0, "OpenAI — ✨ Built-in");
    await modActivationPage.clickActivateAndWaitForModsPageRedirect();

    await page.goto("/");
  });

  async function assertSidebarVisible() {
    const sidebarPage = await getSidebarPage(page, extensionId);
    // Check tab title is visible: see https://github.com/pixiebrix/pixiebrix-extension/issues/9381
    await expect(
      sidebarPage.getByRole("tab", { name: "ChatGPT Sidebar" }),
    ).toBeVisible();

    // Tab content is visible
    await expect(
      sidebarPage.getByRole("heading", { name: "One-Click Prompts" }),
    ).toBeVisible();
  }

  await test.step("Open Sidebar and assert activated mod component is showing", async () => {
    const floatingActionButton = new FloatingActionButton(page);
    await floatingActionButton.toggleSidebar();

    await assertSidebarVisible();
  });

  await test.step("Expand the mod in the listing panel", async () => {
    pageEditorPage = await newPageEditorPage(page.url());

    await pageEditorPage.modListingPanel
      .getModListItemByName("ChatGPT Sidebar")
      .select();

    // Provide time for the draft to be injected
    await sleep(500);

    await assertSidebarVisible();
  });

  await test.step("Select Primary Sidebar component and assert panel heading is visible", async () => {
    await pageEditorPage.modListingPanel
      .getModListItemByName("[Panel]: Primary Sidebar")
      .select();

    // Provide time for the draft to be injected
    await sleep(500);

    await assertSidebarVisible();
  });

  await test.step("Select a trigger component and assert panel heading is visible", async () => {
    await pageEditorPage.modListingPanel
      .getModListItemByName("[Event] Create/Edit Prompt")
      .select();

    // Provide time for the draft to be injected
    await sleep(500);

    await assertSidebarVisible();
  });

  await test.step("Reselect Primary Sidebar component and assert panel heading is visible", async () => {
    await pageEditorPage.modListingPanel
      .getModListItemByName("[Panel]: Primary Sidebar")
      .select();

    // Provide time for the draft to be injected
    await sleep(500);

    await assertSidebarVisible();
  });

  await test.step("Reselect the trigger component and assert panel heading is visible", async () => {
    await pageEditorPage.modListingPanel
      .getModListItemByName("[Event] Create/Edit Prompt")
      .select();

    // Provide time for the draft to be injected
    await sleep(500);

    await assertSidebarVisible();
  });
});
