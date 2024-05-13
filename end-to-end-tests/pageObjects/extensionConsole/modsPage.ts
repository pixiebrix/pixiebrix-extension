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
import { getBaseExtensionConsoleUrl } from "../constants";
import { ensureVisibility } from "../../utils";

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
    await ensureVisibility(activeModsHeading, { timeout: 10_000 });
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

  searchModsInput() {
    return this.page.getByTestId("blueprints-search-input");
  }

  /**
   * Deletes a standalone mod component by name. This method will conditionally deactivate the mod as needed.
   * Will fail if the mod is not found, or multiple mods are found for the same mod name.
   * @param modName the name of the standalone mod to delete (must be a standalone mod, not a packaged mod)
   */
  async deleteModByName(modName: string) {
    await this.searchModsInput().fill(modName);
    const modToDelete = this.page.locator(".list-group-item", {
      hasText: modName,
    });
    await expect(modToDelete).toBeVisible();

    // There is a race condition in the Page Editor where the action dropdown menu will disappear when
    // certain network requests resolve, so we need to add handling to retry clicking the dropdown menu if it
    // disappears.
    await expect(async () => {
      await modToDelete.locator(".dropdown").click();
      const deactivateOption = modToDelete.getByRole("button", {
        name: "Deactivate",
      });
      if (await deactivateOption.isVisible()) {
        await deactivateOption.click({
          timeout: 500,
        });
      }

      await modToDelete.locator(".dropdown").click();
      const deleteOption = modToDelete.getByRole("button", { name: "Delete" });
      await expect(deleteOption).toBeVisible({
        timeout: 500,
      });
    }).toPass({
      timeout: 5000,
    });

    await expect(async () => {
      await modToDelete.locator(".dropdown").click();
      await this.page.getByRole("button", { name: "Delete" }).click({
        timeout: 500,
      });
    }).toPass({
      timeout: 2000,
    });
    await this.page.getByRole("button", { name: "Delete" }).click();
    await expect(
      this.page.getByText(`Deleted mod ${modName} from your account`),
    ).toBeVisible();
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
    // Loading the mod details may take more than 5 seconds
    await expect(this.page.getByText(this.modId)).toBeVisible({
      timeout: 10_000,
    });
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
    // Loading mods sometimes takes upwards of 5s
    await expect(modsPage.modTableItems().getByText(this.modId)).toBeVisible({
      timeout: 10_000,
    });
    return modsPage;
  }
}
