/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { Expression } from "@/core";
import { getPreviewValues } from "@/components/fields/fieldUtils";

test("returns value for an expression", () => {
  const expectedValue = "nunjucks template with var {{@data}}";
  const config = {
    description: {
      __type__: "nunjucks",
      __value__: expectedValue,
    } as Expression,
  };

  const { description } = getPreviewValues(config);

  expect(description).toBe(expectedValue);
});

test("do not change arrays", () => {
  const items = ["a", "b", "c"];
  const config = {
    array: items,
  };

  const { array } = getPreviewValues(config);

  expect(array).toEqual(items);
});

test("converts nested expressions", () => {
  const expectedValue = "header with data {{@data}}";
  const config = {
    properties: {
      header: {
        __type__: "nunjucks",
        __value__: expectedValue,
      } as Expression,
    },
  };

  const {
    properties: { header },
  } = getPreviewValues(config);

  expect(header).toBe(expectedValue);
});
