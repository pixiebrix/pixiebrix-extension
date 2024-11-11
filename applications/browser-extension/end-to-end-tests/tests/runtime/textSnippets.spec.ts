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
import { waitForSnippetShortcutMenuReadiness } from "../../utils";

test("text snippet shortcut functionality", async ({ page, extensionId }) => {
  const modId = "@e2e-testing/text-snippets-test";

  const modActivationPage = new ActivateModPage(page, extensionId, modId);
  await modActivationPage.goto();

  await modActivationPage.clickActivateAndWaitForModsPageRedirect();

  await page.goto("/advanced-fields/");
  await waitForSnippetShortcutMenuReadiness(page);

  const inputField = page.getByLabel("input", { exact: true });
  const echoTextShortcut = page.getByLabel("Echo Text");
  const staticSnippetShortcut = page.getByLabel("Static Snippet");

  await inputField.click();
  await inputField.press("\\");
  await expect(echoTextShortcut).toBeVisible();
  await expect(staticSnippetShortcut).toBeVisible();

  await staticSnippetShortcut.click();
  await expect(inputField).toHaveValue("static snippet");
  await expect(echoTextShortcut).toBeHidden();
  await expect(staticSnippetShortcut).toBeHidden();

  await inputField.pressSequentially(" asdf \\");
  await expect(echoTextShortcut).toBeVisible();
  await expect(staticSnippetShortcut).toBeVisible();
  await echoTextShortcut.click();
  await expect(inputField).toHaveValue(
    "static snippet asdf static snippet asdf \\",
  );
  await expect(echoTextShortcut).toBeHidden();
  await expect(staticSnippetShortcut).toBeHidden();
});
