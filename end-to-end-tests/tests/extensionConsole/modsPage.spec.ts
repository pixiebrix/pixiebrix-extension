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
import { ModsPage } from "../../pageObjects/extensionConsole/modsPage";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { test as base } from "@playwright/test";

test("can open mod in the workshop", async ({ page, extensionId }) => {
  const modId = "@e2e-testing/shared-notes-sidebar";

  const modsPage = new ModsPage(page, extensionId);
  await modsPage.goto();
  await modsPage.actionForModById(modId, "Edit in Workshop");

  await expect(async () => {
    const pageTitle = await page.title();
    expect(pageTitle).toBe("Edit [Testing] St... | PixieBrix");
  }).toPass({
    // Clicking Edit in Workshop fetches editable packages to determine the surrogate package id
    timeout: 20_000,
  });
});
