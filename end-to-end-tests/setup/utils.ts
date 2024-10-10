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

import { type BrowserContext, type Page, expect } from "@playwright/test";

export const openExtensionConsoleFromAdmin = async (
  adminPage: Page,
  context: BrowserContext,
  userName: string,
): Promise<Page> => {
  const newPagePromise = context.waitForEvent("page", { timeout: 5000 });

  await adminPage
    .locator("button")
    .filter({ hasText: "Open Extension Console" })
    .click();

  const extensionConsolePage = await newPagePromise;
  await extensionConsolePage.waitForURL(/\/options\.html#\/$/);

  await expect(extensionConsolePage.locator("#container")).toContainText(
    "Extension Console",
    {
      timeout: 10_000,
    },
  );
  await expect(extensionConsolePage.getByText(userName)).toBeVisible({
    timeout: 5000,
  });

  return extensionConsolePage;
};
