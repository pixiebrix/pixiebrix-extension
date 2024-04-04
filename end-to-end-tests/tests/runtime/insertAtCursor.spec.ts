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
import { ActivateModPage } from "../../pageObjects/modsPage";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { test as base } from "@playwright/test";
import { getSidebarPage } from "../../utils";

test("8157: can insert in draftjs editor", async ({ page, extensionId }) => {
  const modId = "@pixies/test/insert-at-cursor";

  const modActivationPage = new ActivateModPage(page, extensionId, modId);
  await modActivationPage.goto();

  await modActivationPage.clickActivateAndWaitForModsPageRedirect();

  await page.goto("/advanced-fields/");

  // The mod contains a trigger to open the sidebar on h1
  await page.click("h1");

  const sideBarPage = await getSidebarPage(page, extensionId);
  await expect(
    sideBarPage.getByRole("heading", { name: "Insert at Cursor" }),
  ).toBeVisible();

  // Normal text input field
  const input = page.getByLabel("input", { exact: true });
  await input.scrollIntoViewIfNeeded();
  await input.click();
  await input.pressSequentially("a");

  await sideBarPage.getByRole("button", { name: "Insert at Cursor" }).click();
  await expect(input).toHaveValue("aHello world!");

  // Normal textarea
  const textarea = page.getByLabel("textarea", { exact: true });
  await textarea.scrollIntoViewIfNeeded();
  await textarea.click();
  await textarea.pressSequentially("ab");
  await textarea.press("ArrowLeft");

  await sideBarPage.getByRole("button", { name: "Insert at Cursor" }).click();
  await expect(textarea).toHaveValue("aHello world!b");

  // Draft.js
  const editor = page.getByLabel("rdw-editor");
  await editor.scrollIntoViewIfNeeded();

  const content = editor.locator("div").nth(1);
  await content.click();
  await content.pressSequentially("start");
  await expect(page.getByText("start")).toBeVisible();

  await page.getByText("start").click();

  await sideBarPage.getByRole("button", { name: "Insert at Cursor" }).click();

  await expect(page.getByText("startHello world!")).toBeVisible();
});
