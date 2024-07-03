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
  let extensionConsolePage: Page | undefined;
  // Sometimes get the following error "Error: Could not establish connection. Receiving end does not exist."
  // when trying to click on the "Open Extension Console" button. This happens when the Extension has not fully
  // initialized to be able to receive messages via the external messenger api, which happens when the Extension
  // reloads after linking. Thus, we wrap the following with an `expect.toPass` retry.
  await expect(async () => {
    await adminPage
      .locator("button")
      .filter({ hasText: "Open Extension Console" })
      .click();

    extensionConsolePage = context
      .pages()
      .find((page) => page.url().endsWith("/options.html#/"));

    if (!extensionConsolePage) {
      throw new Error("Extension console page not found");
    }

    await expect(extensionConsolePage.locator("#container")).toContainText(
      "Extension Console",
    );
    await expect(extensionConsolePage.getByText(userName)).toBeVisible();
  }).toPass({ timeout: 15_000 });

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- needed for strict null check
  return extensionConsolePage as Page;
};
