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
  readonly root: Locator;
  readonly page: Page;

  readonly locator: Locator["locator"];
  readonly getByAltText: Locator["getByAltText"];
  readonly getByLabel: Locator["getByLabel"];
  readonly getByPlaceholder: Locator["getByPlaceholder"];
  readonly getByRole: Locator["getByRole"];
  readonly getByTestId: Locator["getByTestId"];
  readonly getByText: Locator["getByText"];
  readonly getByTitle: Locator["getByTitle"];

  constructor(rootLocatorOrPage: Locator | Page) {
    if ("page" in rootLocatorOrPage) {
      this.root = rootLocatorOrPage;
      this.page = rootLocatorOrPage.page();
    } else {
      this.root = rootLocatorOrPage.locator("body");
      this.page = rootLocatorOrPage;
    }

    this.locator = this.root.locator.bind(this.root);
    this.getByAltText = this.root.getByAltText.bind(this.root);
    this.getByLabel = this.root.getByLabel.bind(this.root);
    this.getByPlaceholder = this.root.getByPlaceholder.bind(this.root);
    this.getByRole = this.root.getByRole.bind(this.root);
    this.getByTestId = this.root.getByTestId.bind(this.root);
    this.getByText = this.root.getByText.bind(this.root);
    this.getByTitle = this.root.getByTitle.bind(this.root);
  }
}
