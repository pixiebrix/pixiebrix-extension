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

type LocatorMethod =
  | "locator"
  | "getByAltText"
  | "getByLabel"
  | "getByPlaceholder"
  | "getByRole"
  | "getByTestId"
  | "getByText"
  | "getByTitle";

export class BasePageObject {
  protected readonly root: Locator;
  protected readonly page: Page;

  protected locator: Pick<Locator, "locator">;
  protected getByAltText: Pick<Locator, "getByAltText">;
  protected getByLabel: Pick<Locator, "getByLabel">;
  protected getByPlaceholder: Pick<Locator, "getByPlaceholder">;
  protected getByRole: Pick<Locator, "getByRole">;
  protected getByTestId: Pick<Locator, "getByTestId">;
  protected getByText: Pick<Locator, "getByText">;
  protected getByTitle: Pick<Locator, "getByTitle">;

  constructor(rootLocatorOrPage: Locator | Page) {
    if ("page" in rootLocatorOrPage) {
      this.root = rootLocatorOrPage;
      this.page = rootLocatorOrPage.page();
    } else {
      this.root = rootLocatorOrPage.locator("body");
      this.page = rootLocatorOrPage;
    }

    this.locator = this.passThroughMethod("locator");
    this.getByAltText = this.passThroughMethod("getByAltText");
    this.getByLabel = this.passThroughMethod("getByLabel");
    this.getByPlaceholder = this.passThroughMethod("getByPlaceholder");
    this.getByRole = this.passThroughMethod("getByRole");
    this.getByTestId = this.passThroughMethod("getByTestId");
    this.getByText = this.passThroughMethod("getByText");
    this.getByTitle = this.passThroughMethod("getByTitle");
  }

  private passThroughMethod<T extends LocatorMethod>(method: T): Locator[T] {
    // const enhanced: LocatorMethod<T> = (
    //   arg,
    //   { frame, portal, ...options } = {},
    // ) => {
    //   return this.getParent(frame, portal)[method](arg as any, options);
    // };

    // eslint-disable-next-line security/detect-object-injection -- passthrough method
    return this.root[method];
  }
}
