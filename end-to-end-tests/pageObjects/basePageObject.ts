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

import { type Locator, type Page } from "playwright";

export class BasePageObject {
  protected readonly root: Locator;
  protected readonly page: Page;

  protected locator: Locator["locator"];
  protected getByAltText: Locator["getByAltText"];
  protected getByLabel: Locator["getByLabel"];
  protected getByPlaceholder: Locator["getByPlaceholder"];
  protected getByRole: Locator["getByRole"];
  protected getByTestId: Locator["getByTestId"];
  protected getByText: Locator["getByText"];
  protected getByTitle: Locator["getByTitle"];

  constructor(rootLocatorOrPage: Locator | Page) {
    if ("page" in rootLocatorOrPage) {
      this.root = rootLocatorOrPage;
      this.page = rootLocatorOrPage.page();
    } else {
      this.root = rootLocatorOrPage.locator("body");
      this.page = rootLocatorOrPage;
    }

    this.locator = this.root.locator;
    this.getByAltText = this.root.getByAltText;
    this.getByLabel = this.root.getByLabel;
    this.getByPlaceholder = this.root.getByPlaceholder;
    this.getByRole = this.root.getByRole;
    this.getByTestId = this.root.getByTestId;
    this.getByText = this.root.getByText;
    this.getByTitle = this.root.getByTitle;
  }
}
