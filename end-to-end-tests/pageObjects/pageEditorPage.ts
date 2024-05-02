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
import { type BrowserContext, type Page } from "@playwright/test";
import { expect } from "../fixtures/extensionBase";
import { uuidv4 } from "@/types/helpers";

// TODO: add the rest of the starter brick names (as they appear in the UI) or
//  reuse a type from the codebase if it exists
export type StarterBrickName = "Context Menu" | "Trigger" | "Button";

export class PageEditorPage {
  private readonly pageEditorUrl: string;
  private page: Page;

  constructor(
    private readonly context: BrowserContext,
    private readonly urlToConnectTo: string,
    extensionId: string,
    private readonly addStandaloneModToCleanup: (modName: string) => void,
  ) {
    this.pageEditorUrl = getBasePageEditorUrl(extensionId);
  }

  async goto() {
    const pageEditorPage = await this.context.newPage();
    await pageEditorPage.goto(this.pageEditorUrl);
    // Set the viewport size to the expected in horizontal layout size of the devconsole when docked on the bottom.
    await pageEditorPage.setViewportSize({ width: 1280, height: 300 });
    await pageEditorPage.getByTestId(`tab-${this.urlToConnectTo}`).click();
    const heading = pageEditorPage.getByRole("heading", {
      name: "Welcome to the Page Editor!",
    });
    await expect(heading).toBeVisible();
    this.page = pageEditorPage;
  }

  getTemplateGalleryButton() {
    return this.page.getByRole("button", { name: "Launch Template Gallery" });
  }

  /**
   * Adds a starter brick in the Page Editor. Randomly generates a mod name to prevent
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
    this.addStandaloneModToCleanup(modName);
  }
}
