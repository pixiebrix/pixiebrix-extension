/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { getAttributeExamples } from "@/contentScript/pageEditor/elementInformation";

describe("getAttributeExamples", () => {
  test("it gets attributes", () => {
    document.body.innerHTML = '<div id="abc"></div>';
    expect(getAttributeExamples("#abc")).toEqual([
      { name: "id", value: "abc" },
    ]);
  });

  test("it gets data attributes", () => {
    document.body.innerHTML = '<div id="abc" data-foo="abc"></div>';
    expect(getAttributeExamples("#abc")).toEqual([
      { name: "id", value: "abc" },
      { name: "data-foo", value: "abc" },
    ]);
  });

  test("it takes first duplicate", () => {
    document.body.innerHTML = '<div><a id="abc"></a><a id="def"></a></div>';
    expect(getAttributeExamples("a")).toEqual([{ name: "id", value: "abc" }]);
  });
});
