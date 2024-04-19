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
import { ActivateModPage } from "../../pageObjects/extensionConsole/modsPage";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { test as base } from "@playwright/test";
import {
  ensureVisibility,
  getSidebarPage,
  waitForSelectionMenuReadiness,
} from "../../utils";
import { MV } from "../../env";

test.describe("Insert at Cursor", () => {
  test("8157: can insert at cursor from side bar", async ({
    page,
    extensionId,
  }) => {
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

    // Basic content editable
    const editable = page.locator("div[contenteditable]").first();
    await textarea.scrollIntoViewIfNeeded();
    await editable.click();
    await editable.pressSequentially("ab");
    await editable.press("ArrowLeft");

    await sideBarPage.getByRole("button", { name: "Insert at Cursor" }).click();
    await expect(editable).toHaveText("aHello world!b");

    // Draft.js - target by aria-label
    const editor = page.getByLabel("rdw-editor");
    await editor.scrollIntoViewIfNeeded();

    await editor.click();

    if (MV === "2") {
      // Need to simulate the mouse entering the sidebar to track focus on MV2
      // https://github.com/pixiebrix/pixiebrix-extension/blob/1794863937f343fbc8e3a4434eace74191f8dfbd/src/contentScript/sidebarController.tsx#L563-L563
      const sidebarFrame = page.locator("#pixiebrix-extension");
      await sidebarFrame.dispatchEvent("mouseenter");
    }

    await sideBarPage.getByRole("button", { name: "Insert at Cursor" }).click();

    await expect(editor.getByText("Hello world!")).toBeVisible();

    await editor.click();
    await editor.press("ArrowLeft");
    await sideBarPage.getByRole("button", { name: "Insert at Cursor" }).click();

    await expect(editor.getByText("Hello worldHello world!!")).toBeVisible();
  });

  test("8154: can insert at cursor after opening sidebar from selection menu", async ({
    page,
    extensionId,
  }) => {
    // This mod opens the sidebar with a selection menu option, and then inserts "Hello world!" at the cursor from the sidebar
    const modId = "@pixies/test/insert-at-cursor-with-selection-menu";

    const modActivationPage = new ActivateModPage(page, extensionId, modId);
    await modActivationPage.goto();

    await modActivationPage.clickActivateAndWaitForModsPageRedirect();

    await page.goto("/advanced-fields/");

    // Testing with CKEditor 5
    const ckeditorEditingArea = page.getByLabel("Editor editing area: main");
    await ckeditorEditingArea.scrollIntoViewIfNeeded();

    await waitForSelectionMenuReadiness(page);
    // Focus on the editor
    await ckeditorEditingArea.getByText("This is an editor").click();
    await ckeditorEditingArea.getByText("This is an editor").selectText();
    const insertAtCursorMenuItem = page.getByRole("menuitem", { name: "⬇️" });
    await ensureVisibility(insertAtCursorMenuItem);
    await insertAtCursorMenuItem.click();

    const sideBarPage = await getSidebarPage(page, extensionId);
    await sideBarPage.getByRole("button", { name: "Insert at Cursor" }).click();

    await expect(ckeditorEditingArea.getByRole("paragraph")).toContainText(
      "Hello world!",
    );
  });
});
