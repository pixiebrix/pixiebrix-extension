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

class BasePageObject implements Partial<Locator> {
  private readonly baseLocator: Locator;
  constructor(locatorOrPage: Locator | Page) {
    if ("page" in locatorOrPage) {
      this.baseLocator = locatorOrPage;
    } else {
      this.baseLocator = locatorOrPage.locator("body");
    }

    return new Proxy(this, {
      get: function (target, prop, receiver) {
        if (Reflect.has(target, prop)) {
          return Reflect.get(target, prop, receiver);
        } else if (Reflect.has(target.baseLocator, prop)) {
          if (typeof target.baseLocator[prop] === "function") {
            return function (...args) {
              return target.baseLocator[prop].apply(target.baseLocator, args);
            };
          } else {
            return target.baseLocator[prop];
          }
        }
      },
    });
  }
}

export default BasePageObject as unknown as new (
  locatorOrPage: Locator | Page,
) => Locator;
