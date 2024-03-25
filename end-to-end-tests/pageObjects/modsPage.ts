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
    // `activeModsHeading` may be initially be detached and hidden, so toBeVisible() would immediately fail
    await expect(async () => {
      await expect(activeModsHeading).toBeVisible();
    }).toPass();
  }

  async viewAllMods() {
    await this.page.getByTestId("all-mods-mod-tab").click();
  }

  async viewActiveMods() {
    await this.page.getByTestId("active-mod-tab").click();
  }

  modTableItems() {
    return this.page.getByRole("table").locator(".list-group-item");
  }

  // TODO: remove knip comment once this method is used in a test
  /** @knip test helper, will be used in future tests */
  searchModsInput() {
    return this.page.getByTestId("blueprints-search-input");
  }
}

export class ActivateModPage {
  private readonly baseConsoleUrl: string;
  private readonly activateModUrl: string;

  constructor(
    private readonly page: Page,
    private readonly extensionId: string,
    private readonly modId: string,
  ) {
    this.baseConsoleUrl = getBaseExtensionConsoleUrl(extensionId);
    this.activateModUrl = `${
      this.baseConsoleUrl
    }#/marketplace/activate/${encodeURIComponent(modId)}`;
  }

  async goto() {
    await this.page.goto(this.activateModUrl);

    await expect(this.page.getByText("Activate Mod")).toBeVisible();
    await expect(this.page.getByText(this.modId)).toBeVisible();
  }

  activateButton() {
    return this.page.getByRole("button", { name: "Activate" });
  }

  /** Successfully activating the mod will navigate to the "All Mods" page. */
  async clickActivateAndWaitForModsPageRedirect() {
    await this.activateButton().click();
    await this.page.waitForURL(`${this.baseConsoleUrl}#/mods`);
    const modsPage = new ModsPage(this.page, this.extensionId);
    await modsPage.viewActiveMods();
    await expect(modsPage.modTableItems().getByText(this.modId)).toBeVisible();
    return modsPage;
  }
}
