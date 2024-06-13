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

import { type Locator, type Page, expect } from "@playwright/test";
import { getBaseExtensionConsoleUrl } from "../../constants";
import { EditWorkshopModPage } from "end-to-end-tests/pageObjects/extensionConsole/workshop/editWorkshopModPage";
import { CreateWorkshopModPage } from "./createWorkshopModPage";

export class WorkshopPage {
  private readonly extensionConsoleUrl: string;
  private readonly createNewBrickButton: Locator;

  constructor(
    private readonly page: Page,
    extensionId: string,
  ) {
    this.extensionConsoleUrl = getBaseExtensionConsoleUrl(extensionId);
    this.createNewBrickButton = this.page.getByRole("button", {
      name: "Create New Brick",
    });
  }

  async goto() {
    await this.page.goto(this.extensionConsoleUrl);
    await this.page
      .getByRole("link", {
        name: "Workshop",
      })
      .click();
  }

  async findAndSelectMod(modId: string) {
    await this.page
      .getByPlaceholder("Start typing to find results")
      .fill(modId);
    await this.page.getByRole("cell", { name: modId }).click();

    return new EditWorkshopModPage(this.page);
  }

  async createNewBrickFromModDefinition(modDefinitionName: string) {
    await this.createNewBrickButton.click();
    const createPage = new CreateWorkshopModPage(this.page);
    const modId =
      await createPage.editor.replaceWithModDefinition(modDefinitionName);
    await createPage.createBrickButton.click();
    await expect(
      this.page.getByRole("status").getByText("Created "),
    ).toBeVisible({ timeout: 8000 });
    return modId;
  }

  async deletePackagedModByModId(modId: string) {
    await this.page.bringToFront(); // TODO: is this needed?
    const editWorkshopModPage = await this.findAndSelectMod(modId);
    await editWorkshopModPage.deleteBrick();
  }
}
