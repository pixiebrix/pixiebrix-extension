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

test.describe("extension console smoke test", () => {
  test("can open the extension console", async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await expect(page.getByText("Extension Console")).toBeInViewport();
    const activeModsHeading = page.getByRole("heading", {
      name: "Active Mods",
    });
    // The heading may be temporarily hidden, so we use toBeAttached and not.toBeHidden instead of toBeVisible
    // since toBeVisible will immediately fail if the element is in the dom and hidden
    await expect(activeModsHeading).toBeAttached();
    await expect(activeModsHeading).not.toBeHidden();
  });
});
