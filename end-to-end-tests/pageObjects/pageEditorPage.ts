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
 */
export class PageEditorPage {
  private readonly pageEditorUrl: string;
  private readonly savedStandaloneModNames: string[] = [];

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
  async addStarterBrick(starterBrickName: StarterBrickName) {
    const modName = `Test ${starterBrickName} ${uuidv4()}`;
    await this.page.getByRole("button", { name: "Add", exact: true }).click();
    await this.page
      .locator("[role=button].dropdown-item", {
        hasText: starterBrickName,
      })
      .click();
    await this.fillInBrickField("Name", modName);
    return modName;
  }

  async fillInBrickField(fieldLabel: string, value: string) {
    await this.page.getByLabel(fieldLabel).fill(value);
  }

  async saveStandaloneMod(modName: string) {
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
