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
import { test as base } from "@playwright/test";
import { getSidebarPage } from "../../utils";

test("can set input value", async ({ page, extensionId }) => {
  const modId = "@pixies/test/field-set-value";

  const modActivationPage = new ActivateModPage(page, extensionId, modId);
  await modActivationPage.goto();

  await modActivationPage.clickActivateAndWaitForModsPageRedirect();

  await page.goto("/advanced-fields/");

  // The mod contains a trigger to open the sidebar on h1
  await page.click("h1");

  const sideBarPage = await getSidebarPage(page, extensionId);
  await expect(
    sideBarPage.getByRole("heading", { name: "Set Input Values" }),
  ).toBeVisible();

  // Normal text input field
  const input = page.getByLabel("input", { exact: true });
  await input.scrollIntoViewIfNeeded();
  await input.click();
  await input.pressSequentially("abc");

  await sideBarPage.getByRole("button", { name: "Set Text Input" }).click();
  await expect(input).toHaveValue("Hello world!");

  // Normal textarea
  const textarea = page.getByLabel("textarea", { exact: true });
  await textarea.scrollIntoViewIfNeeded();
  await textarea.click();
  await textarea.pressSequentially("abc");

  await sideBarPage
    .getByRole("button", { name: "Set Text Area Input" })
    .click();
  await expect(textarea).toHaveValue("Hello world!");

  // Basic content editable
  const editable = page.locator("div[contenteditable]").first();
  await textarea.scrollIntoViewIfNeeded();
  await editable.click();
  await editable.pressSequentially("abc");

  await sideBarPage
    .getByRole("button", { name: "Set Content Editable" })
    .click();
  await expect(editable).toHaveText("Hello world!");

  // Draft.js - target by aria-label
  // https://github.com/pixiebrix/pixiebrix-extension/issues/8166
  const editor = page.getByLabel("rdw-editor");
  await editor.scrollIntoViewIfNeeded();

  await editor.click();

  await editor.click();
  await editor.pressSequentially("abc ");
  await editor.press("Enter");
  await sideBarPage.getByRole("button", { name: "Set Draft.js" }).click();

  await expect(editor.getByText("Hello world!", { exact: true })).toBeVisible();
});
