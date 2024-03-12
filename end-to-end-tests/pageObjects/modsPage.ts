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

import { expect, type Page } from "@playwright/test";
import { getBaseExtensionConsoleUrl } from "./constants";

export class ModsPage {
  private readonly extensionConsoleUrl: string;

  constructor(
    private readonly page: Page,
    extensionId: string,
  ) {
    this.extensionConsoleUrl = getBaseExtensionConsoleUrl(extensionId);
  }

  async goto() {
    await this.page.goto(this.extensionConsoleUrl);
    await expect(this.page.getByText("Extension Console")).toBeVisible();
    const activeModsHeading = this.page.getByRole("heading", {
      name: "Active Mods",
    });
    // `activeModsHeading` may be initially hidden, so toBeVisible() would immediately fail
    await expect(activeModsHeading).toBeAttached();
    await expect(activeModsHeading).not.toBeHidden();
  }

  async viewAllMods() {
    await this.page.getByTestId("all-mods-mod-tab").click();
  }

  async getAllModTableItems() {
    return this.page.getByRole("table").locator(".list-group-item");
  }
}
