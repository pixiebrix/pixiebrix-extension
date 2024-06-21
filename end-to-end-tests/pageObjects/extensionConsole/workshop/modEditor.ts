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
import fs from "node:fs/promises";
import path from "node:path";
import { uuidv4 } from "@/types/helpers";

export class WorkshopModEditor {
  readonly textArea: Locator;
  readonly content: Locator;
  readonly baseLocator: Locator;

  constructor(private readonly page: Page) {
    this.baseLocator = this.page.getByLabel("Editor");
    this.content = this.baseLocator.locator(".ace_content");
    this.textArea = this.baseLocator.getByRole("textbox");
  }

  async waitForLoad() {
    await expect(this.textArea).toBeVisible();
    await expect(this.baseLocator.getByText("Loading editor...")).toBeHidden();
  }

  async getValue() {
    // Ace editor does not provide an easy way for e2e tests to get the value of the textarea with new line spacing intact,
    // so we use the clipboard API to copy the text and then read it from the clipboard
    await this.textArea.press("ControlOrMeta+a");
    await this.textArea.press("ControlOrMeta+c");
    const handle = await this.page.evaluateHandle(async () =>
      navigator.clipboard.readText(),
    );
    return handle.jsonValue();
  }

  async findText(text: string) {
    await this.content.click(); // Focus on the visible editor
    await this.page.keyboard.press("ControlOrMeta+f");
    await this.page.getByPlaceholder("Search for").fill(text);
  }

  async findAndReplaceText(findText: string, replaceText: string) {
    await this.findText(findText);
    await this.page.getByText("+", { exact: true }).click();
    await this.page.getByPlaceholder("Replace with").fill(replaceText);
    await this.page.getByText("Replace").click();
  }

  // Loads the corresponding yaml from the fixtures/modDefinitions directory
  async replaceWithModDefinition(modDefinitionName: string) {
    const modDefinition = await fs.readFile(
      path.join(
        __dirname,
        `../../../fixtures/modDefinitions/${modDefinitionName}.yaml`,
      ),
      "utf8",
    );
    const uuid = uuidv4();
    const modId = `@extension-e2e-test-unaffiliated/${modDefinitionName}-${uuid}`;
    const replacedDefinition = modDefinition.replace("{{ modId }}", modId);

    await this.textArea.fill(replacedDefinition);
    return modId;
  }
}
