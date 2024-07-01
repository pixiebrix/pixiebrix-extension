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
  ensureVisibility,
  getSidebarPage,
  waitForSelectionMenuReadiness,
} from "../../utils";

test.describe("sidebar page smoke test", () => {
  test("can open the sidebar from selection menu action and view the related mod's sidebar panel", async ({
    page,
    extensionId,
  }) => {
    const modId = "@pixies/ai/writer-assist";

    const modActivationPage = new ActivateModPage(page, extensionId, modId);
    await modActivationPage.goto();
    // The default integration values are not immediately loaded and are temporarily empty.
    // If we try activating too fast, the activation will fail due to missing configuration, so we wait for the values to load.
    await expect(
      modActivationPage.getByText("OpenAI — ✨ Built-in", { exact: true }),
    ).toBeVisible();
    await modActivationPage.clickActivateAndWaitForModsPageRedirect();

    await page.goto("/bootstrap-5");
    await waitForSelectionMenuReadiness(page);

    await page.getByRole("heading", { name: "PixieBrix" }).selectText();
    const writerAssistMenuItem = page.getByRole("menuitem", { name: "✍️" });
    // The menu item may be initially hidden, so toBeVisible() would immediately fail
    await ensureVisibility(writerAssistMenuItem);
    await writerAssistMenuItem.click();
    const sideBarPage = await getSidebarPage(page, extensionId);
    await expect(
      sideBarPage.getByRole("heading", { name: "✍️ Write Assist" }),
    ).toBeVisible();
  });
});
