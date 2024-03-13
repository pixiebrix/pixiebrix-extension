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

test("can activate a mod with config options", async ({
  page,
  extensionId,
  baseURL,
}) => {
  const modName = "Highlight Specific Keywords When Page Loads";
  const modId = "@pixies/highlight-keywords";

  await page.goto(
    `chrome-extension://${extensionId}/options.html#/marketplace/activate/${encodeURIComponent(
      modId,
    )}`,
  );

  await expect(page.getByText("Activate Mod")).toBeVisible();
  await expect(page.getByText(modName)).toBeVisible();
  await page.click("button:has-text('Activate')");
  await expect(page.getByText(`Installed ${modName}`)).toBeVisible();

  await page.goto(`${baseURL}/bootstrap-5`);

  const highlightedElements = await page.locator("mark").all();

  await Promise.all(
    highlightedElements.map(async (element) => {
      await expect(element).toHaveText("PixieBrix");
    }),
  );
});
