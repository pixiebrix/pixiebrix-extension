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
import { type Frame, type Page, test as base } from "@playwright/test";
import {
  ensureVisibility,
  getSidebarPage,
  waitForSelectionMenuReadiness,
} from "../../utils";

test.describe("Insert at Cursor", () => {
  test("8157: can insert at cursor from side bar", async ({
    page,
    extensionId,
  }) => {
    await test.step("activate the insert at cursor mod and navigate to advanced fields", async () => {
      const modId = "@pixies/test/insert-at-cursor";
      const modActivationPage = new ActivateModPage(page, extensionId, modId);
      await modActivationPage.goto();
      await modActivationPage.clickActivateAndWaitForModsPageRedirect();

      await page.goto("/advanced-fields/");
    });

    // The mod contains a trigger to open the sidebar on h1
    await page.click("h1");
    const sideBarPage = await getSidebarPage(page, extensionId);
    await expect(
      sideBarPage.getByRole("heading", { name: "Insert at Cursor" }),
    ).toBeVisible();

    await test.step("verify insert at normal text input field", async () => {
      const input = page.getByLabel("input", { exact: true });
      await input.scrollIntoViewIfNeeded();
      await input.click();
      await input.pressSequentially("a");

      await sideBarPage
        .getByRole("button", { name: "Insert at Cursor" })
        .click();
      await expect(input).toHaveValue("aHello world!");
    });

    await test.step("verify insert at normal text area", async () => {
      const textarea = page.getByLabel("textarea", { exact: true });
      await textarea.scrollIntoViewIfNeeded();
      await textarea.click();
      await textarea.pressSequentially("ab");
      await textarea.press("ArrowLeft");

      await sideBarPage
        .getByRole("button", { name: "Insert at Cursor" })
        .click();
      await expect(textarea).toHaveValue("aHello world!b");
    });

    await test.step("verify insert at basic content editable", async () => {
      const editable = page.locator("div[contenteditable]").first();
      await editable.scrollIntoViewIfNeeded();
      await editable.click();
      await editable.pressSequentially("ab");
      await editable.press("ArrowLeft");

      await sideBarPage
        .getByRole("button", { name: "Insert at Cursor" })
        .click();
      await expect(editable).toHaveText("aHello world!b");
    });

    await test.step("verify insert at Draft.js", async () => {
      // Target by aria-label
      const editor = page.getByLabel("rdw-editor");
      await editor.scrollIntoViewIfNeeded();

      await editor.click();

      await sideBarPage
        .getByRole("button", { name: "Insert at Cursor" })
        .click();

      await expect(editor.getByText("Hello world!")).toBeVisible();

      await editor.click();
      await editor.press("ArrowLeft");
      await sideBarPage
        .getByRole("button", { name: "Insert at Cursor" })
        .click();

      await expect(editor.getByText("Hello worldHello world!!")).toBeVisible();
    });
  });

  test("8154: can insert at cursor after opening sidebar from selection menu", async ({
    page,
    extensionId,
    chromiumChannel,
  }) => {
    test.skip(
      chromiumChannel === "chrome",
      "Skip test on Chrome. See: https://pixiebrix.slack.com/archives/C07DQ2J7C78",
    );
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
