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

import { type Page } from "@playwright/test";
import { getBaseExtensionConsoleUrl } from "../constants";

export class WorkshopPage {
  private readonly extensionConsoleUrl: string;

  constructor(
    private readonly page: Page,
    extensionId: string,
  ) {
    this.extensionConsoleUrl = getBaseExtensionConsoleUrl(extensionId);
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
  }

  async findText(text: string) {
    await this.page
      .getByLabel("Editor")
      .locator("div")
      .filter({ hasText: text })
      .nth(2)
      .click();

    await this.page.getByRole("textbox").press("ControlOrMeta+f");
    await this.page.getByPlaceholder("Search for").fill(text);
  }

  async findAndReplaceText(findText: string, replaceText: string) {
    await this.findText(findText);
    await this.page.getByText("+", { exact: true }).click();
    await this.page.getByPlaceholder("Replace with").fill(replaceText);
    await this.page.getByText("Replace").click();
  }

  async updateBrick() {
    await this.page.getByRole("button", { name: "Update Brick" }).click();
  }
}
