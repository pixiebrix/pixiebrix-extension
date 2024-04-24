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

export class PageEditorPage {
  private readonly pageEditorUrl: string;
  private page: Page;

  constructor(
    private readonly context: BrowserContext,
    private readonly urlToConnectTo: string,
    extensionId: string,
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
}
