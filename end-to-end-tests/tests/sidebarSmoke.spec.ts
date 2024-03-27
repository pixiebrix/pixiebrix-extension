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
import { ActivateModPage } from "../pageObjects/modsPage";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { type Page, test as base } from "@playwright/test";
import { expectToNotBeHiddenOrUnmounted } from "../utils";

test("can open the sidebar and view installed mod sidebar panel", async ({
  page,
  extensionId,
}) => {
  const modId = "@pixies/ai/writer-assist";

  const modActivationPage = new ActivateModPage(page, extensionId, modId);
  await modActivationPage.goto();

  await modActivationPage.clickActivateAndWaitForModsPageRedirect();

  await page.goto("/bootstrap-5");
  await page.getByRole("heading", { name: "PixieBrix" }).selectText();
  await page.pause();
  await page.getByRole("menuitem", { name: "✍️" }).click();
  await expect(() => {
    const sideBarPage: Page = page
      .context()
      .pages()
      .find((value) =>
        value
          .url()
          .startsWith(`chrome-extension://${extensionId}/sidebar.html`),
      );
    expect(sideBarPage).toBeDefined();
  }).toPass();
  const sideBarPage: Page = page
    .context()
    .pages()
    .find((value) =>
      value.url().startsWith(`chrome-extension://${extensionId}/sidebar.html`),
    );
  await sideBarPage.pause();
  await expectToNotBeHiddenOrUnmounted(
    sideBarPage.getByRole("heading", { name: "✍️ Write Assist" }),
  );
});
