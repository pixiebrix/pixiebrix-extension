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

import { getBasePageEditorUrl } from "./constants";
import { type Page, expect } from "@playwright/test";
import { uuidv4 } from "@/types/helpers";
import { ModsPage } from "./extensionConsole/modsPage";

// Starter brick names as shown in the Page Editor UI
export type StarterBrickName =
  | "Context Menu"
  | "Trigger"
  | "Button"
  | "Quick Bar Action"
  | "Dynamic Quick Bar"
  | "Sidebar Panel"
  | "Tour";

/**
 * Page object for the Page Editor. Prefer the newPageEditorPage fixture in extensionBase.ts to directly creating an
 * instance of this class to take advantage of automatic cleanup of saved mods.
 *
 * @knip usage of PageEditorPage indirectly via the newPageEditorPage fixture in extensionBase.ts causes a
 * false-positive
 */
export class PageEditorPage {
  private readonly pageEditorUrl: string;
  private readonly savedStandaloneModNames: string[] = [];
  private modName: string;

  constructor(
    private readonly page: Page,
    private readonly urlToConnectTo: string,
    private readonly extensionId: string,
  ) {
    this.pageEditorUrl = getBasePageEditorUrl(extensionId);
  }

  async goto() {
    await this.page.goto(this.pageEditorUrl);
    // Set the viewport size to the expected in horizontal layout size of the devconsole when docked on the bottom.
    await this.page.setViewportSize({ width: 1280, height: 300 });
    await this.page.getByTestId(`tab-${this.urlToConnectTo}`).click();
    const heading = this.page.getByRole("heading", {
      name: "Welcome to the Page Editor!",
    });
    await expect(heading).toBeVisible();
  }

  async bringToFront() {
    await this.page.bringToFront();
  }

  getPage() {
    return this.page;
  }

  getTemplateGalleryButton() {
    return this.page.getByRole("button", { name: "Launch Template Gallery" });
  }

  /**
   * Adds a starter brick in the Page Editor. Generates a unique mod name to prevent
   * test collision.
   *
   * @param starterBrickName the starter brick name to add, corresponding to the name shown in the Page Editor UI,
   * not the underlying type
   * @returns modName the generated mod name
   */
  async addStarterBrick(
    starterBrickName: StarterBrickName,
    callback?: () => Promise<void>,
  ) {
    this.modName = `Test ${starterBrickName} ${uuidv4()}`;
    await this.page.getByRole("button", { name: "Add", exact: true }).click();
    await this.page
      .locator("[role=button].dropdown-item", {
        hasText: starterBrickName,
      })
      .click();

    if (starterBrickName === "Button" && callback) {
      await callback();
    }

    await this.fillInBrickField("Name", this.modName);
    return this.modName;
  }

  async fillInBrickField(fieldLabel: string, value: string) {
    await this.page.getByLabel(fieldLabel).fill(value);
  }

  async addBrickToModComponent(
    brickName: string,
    { index = 0 }: { index?: number } = {},
  ) {
    await this.page
      .getByTestId(/icon-button-.*-add-brick/)
      .nth(index)
      .click();

    await this.page.getByTestId("tag-search-input").fill(brickName);
    await this.page.getByRole("button", { name: brickName }).click();

    await this.page.getByRole("button", { name: "Add brick" }).click();
  }

  getModListItemByName(modName: string) {
    return this.page
      .locator(".list-group-item")
      .locator("span", { hasText: modName })
      .first();
  }

  /**
   * Save a selected packaged mod. Prefer saveStandaloneMod for standalone mods.
   */
  async saveSelectedPackagedMod() {
    // TODO: this method is currently meant for packaged mods that aren't meant to be
    //  cleaned up after the test. Future work is adding affordance to clean up saved packaged
    //  mods, with an option to avoid cleanup for certain mods.
    await this.page.locator("[data-icon=save]").click();
    await this.page.getByRole("button", { name: "Save" }).click();
  }

  getByText(text: string) {
    return this.page.getByText(text);
  }

  getRenderPanelButton() {
    return this.page.getByRole("button", { name: "Render Panel" });
  }

  getIncrementVersionErrorToast() {
    return this.page.getByText(
      "Cannot overwrite version of a published brick. Increment the version",
    );
  }

  async saveStandaloneMod(modName: string) {
    // We need to wait at least 500ms to permit the page editor to persist the mod changes to redux before saving.
    // https://github.com/pixiebrix/pixiebrix-extension/blob/277eab74d2c85c2d16053bbcd27023d2612f9e31/src/pageEditor/panes/EditorPane.tsx#L48
    // eslint-disable-next-line playwright/no-wait-for-timeout -- see above
    await this.page.waitForTimeout(600);
    const modListItem = this.page.locator(".list-group-item", {
      hasText: modName,
    });
    await modListItem.click();
    await modListItem.locator("[data-icon=save]").click();
    await expect(this.page.getByText("Saved Mod")).toBeVisible();
    this.savedStandaloneModNames.push(modName);
  }

  /**
   * This method is meant to be called exactly once after the test is done to clean up any saved mods created during the
   * test.
   *
   * @see newPageEditorPage in fixtures/extensionBase.ts
   */
  async cleanup() {
    const modsPage = new ModsPage(this.page, this.extensionId);
    await modsPage.goto();
    for (const modName of this.savedStandaloneModNames) {
      // eslint-disable-next-line no-await-in-loop -- optimization via parallelization not relevant here
      await modsPage.deleteModByName(modName);
    }
  }
}
