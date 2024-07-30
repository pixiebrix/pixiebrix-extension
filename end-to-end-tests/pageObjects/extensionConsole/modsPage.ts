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
import { BasePageObject } from "../basePageObject";
import { ensureVisibility } from "../../utils";

export class ModTableItem extends BasePageObject {
  dropdownButton = this.getByTestId("ellipsis-menu-button");
  dropdownMenu = this.getByLabel("Menu");
  statusCell = this.getByTestId("status-cell");

  async clickAction(actionName: string) {
    // Wrapped in `toPass` due to flakiness with dropdown visibility
    // TODO: https://github.com/pixiebrix/pixiebrix-extension/issues/8458
    await expect(async () => {
      if (!(await this.dropdownMenu.isVisible())) {
        await this.dropdownButton.click();
      }

      await this.getByRole("menuitem", { name: actionName }).click({
        // Short timeout in order to handle retrying in the `toPass` block.
        timeout: 500,
      });
    }).toPass({ timeout: 5000 });
  }
}

export class ModsPage extends BasePageObject {
  private readonly extensionConsoleUrl: string;

  modTableItems = this.getByRole("table").locator(".list-group-item");
  searchModsInput = this.getByTestId("blueprints-search-input");

  constructor(page: Page, extensionId: string) {
    super(page);
    this.extensionConsoleUrl = getBaseExtensionConsoleUrl(extensionId);
  }

  async goto() {
    // Interacting with the table is inconsistent after loading it because once the registry request finishes,
    // the table is re-rendered, and any row action dropdowns are closed.
    // To ensure the table is fully loaded, we wait for the registry request to finish before interacting with the table.
    // TODO: remove once fixed: https://github.com/pixiebrix/pixiebrix-extension/issues/8458
    const registryPromise = this.page
      .context()
      .waitForEvent("requestfinished", {
        predicate: (request) => request.url().includes("/api/registry/bricks/"),
        timeout: 15_000,
      });
    await this.page.goto(this.extensionConsoleUrl);
    await expect(this.getByText("Extension Console")).toBeVisible();
    await registryPromise;

    // Check that the content has finished loading
    const contentLoadedLocator = this.getByText("Welcome to PixieBrix!").or(
      this.modTableItems.nth(0),
    );
    await expect(contentLoadedLocator).toBeVisible({ timeout: 15_000 });
  }

  async viewAllMods() {
    await this.getByTestId("all-mods-mod-tab").click();
  }

  async viewActiveMods() {
    await this.getByTestId("active-mod-tab").click();
  }

  modTableItemById(modId: string) {
    return new ModTableItem(this.modTableItems.filter({ hasText: modId }));
  }

  /**
   * Performs a mod screen action for a mod, e.g., Edit in Workshop.
   *
   * For deletion, use deleteModByName because it handles deactivation/confirmation.
   * @see deleteModByName
   */
  async actionForModById(modId: string, actionName: string): Promise<void> {
    await this.page.bringToFront();
    await this.searchModsInput.fill(modId);
    await expect(this.getByText(`results for "${modId}`)).toBeVisible();

    const modTableItem = this.modTableItemById(modId);

    await modTableItem.clickAction(actionName);
  }

  /**
   * Deletes a mod by name. This method will conditionally deactivate the mod as needed.
   * Will fail if the mod is not found, or multiple mods are found for the same mod name.
   * @param modName the name of the mod to delete (user must have permission to delete the mod)
   * @see actionForModById
   */
  async deleteModByName(modName: string) {
    await this.page.bringToFront();
    await this.searchModsInput.fill(modName);
    await expect(this.getByText(`results for "${modName}`)).toBeVisible();
    const modToDelete = this.modTableItemById(modName);
    await expect(modToDelete.root).toBeVisible();

    if ((await modToDelete.statusCell.textContent()) === "Active") {
      await modToDelete.clickAction("Deactivate");
      await expect(this.getByText(`Deactivated mod: ${modName}`)).toBeVisible();
    }

    await modToDelete.clickAction("Delete");
    // Click the delete button in the delete confirmation modal
    await this.getByRole("button", { name: "Delete" }).click();
    await expect(
      // Exact text varies by standalone mod vs. mod package
      this.getByText(`Deleted mod ${modName}`),
    ).toBeVisible();
  }
}

export class ActivateModPage extends BasePageObject {
  private readonly baseConsoleUrl: string;
  private readonly activateModUrl: string;

  activateButton = this.getByRole("button", { name: "Activate" });
  keyboardShortcutDocumentationLink = this.getByRole("link", {
    name: "configuring keyboard shortcuts",
  });

  configureQuickbarShortcutLink = this.getByRole("link", {
    name: "configured your Quick Bar",
  });

  constructor(
    page: Page,
    private readonly extensionId: string,
    private readonly modId: string,
  ) {
    super(page);
    this.baseConsoleUrl = getBaseExtensionConsoleUrl(extensionId);
    this.activateModUrl = `${
      this.baseConsoleUrl
    }#/marketplace/activate/${encodeURIComponent(modId)}`;
  }

  async goto() {
    await this.page.goto(this.activateModUrl);

    await expect(
      this.getByRole("heading", { name: "Activate " }),
    ).toBeVisible();
    // Loading the mod details may take a long time. Using ensureVisibility because the modId may be attached and hidden
    await ensureVisibility(this.getByText(this.modId), {
      timeout: 10_000,
    });
  }

  /** Successfully activating the mod will navigate to the "All Mods" page. */
  async clickActivateAndWaitForModsPageRedirect() {
    await this.activateButton.click();
    await this.page.waitForURL(`${this.baseConsoleUrl}#/mods`);
    const modsPage = new ModsPage(this.page, this.extensionId);
    await modsPage.viewActiveMods();
    // Loading mods sometimes takes upwards of 10s
    await expect(modsPage.modTableItems.getByText(this.modId)).toBeVisible({
      timeout: 10_000,
    });
    return modsPage;
  }
}
