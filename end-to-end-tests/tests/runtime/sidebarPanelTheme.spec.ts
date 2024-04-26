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

import { test } from "../../fixtures/extensionBase";
import { ActivateModPage } from "../../pageObjects/extensionConsole/modsPage";
import { runModViaQuickBar } from "../../utils";

test("custom sidebar theme css file is applied to all levels of sidebar document", async ({
  page,
  extensionId,
}) => {
  const modId = "@pixies/testing/panel-theme";

  const modActivationPage = new ActivateModPage(page, extensionId, modId);
  await modActivationPage.goto();

  await modActivationPage.clickActivateAndWaitForModsPageRedirect();

  await page.goto("/");

  // Ensure the page is focused by clicking on an element before running the keyboard shortcut, see runModViaQuickbar
  await page.getByText("Index of  /").click();
  await runModViaQuickBar(page, "Show Sidebar");

  await page.pause();
});
