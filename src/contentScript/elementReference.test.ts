/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import {
  getElementForReference,
  getReferenceForElement,
} from "@/contentScript/elementReference";
import { uuidv4 } from "@/types/helpers";
import { BusinessError } from "@/errors/businessErrors";
import { ElementReference } from "@/core";

describe("elementReference", () => {
  test("get reference for element", () => {
    const element = document.createElement("div");
    const id = getReferenceForElement(element);
    expect(id).toBeTruthy();
  });

  test("return same reference", () => {
    const element = document.createElement("div");
    const id = getReferenceForElement(element);
    expect(getReferenceForElement(element)).toEqual(id);
  });

  test("lookup reference", () => {
    const element = document.createElement("div");
    const id = getReferenceForElement(element);
    expect(getElementForReference(id)).toEqual(element);
  });

  test("unknown id throws error", () => {
    expect(() => getElementForReference(uuidv4() as ElementReference)).toThrow(
      BusinessError
    );
  });
});
