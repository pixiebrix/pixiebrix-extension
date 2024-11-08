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

import TraverseElements from "./traverseElements";
import { unsafeAssumeValidArg } from "../../runtime/runtimeTypes";
import { getReferenceForElement } from "../../contentScript/elementReference";
import { brickOptionsFactory } from "../../testUtils/factories/runtimeFactories";

const brick = new TraverseElements();

describe("TraverseElements", () => {
  test("find", async () => {
    const div = document.createElement("div");
    document.body.append(div);
    const result = await brick.run(
      unsafeAssumeValidArg({
        selector: "div",
        traversal: "find",
      }),
      brickOptionsFactory(),
    );

    expect(result).toStrictEqual({
      elements: [getReferenceForElement(div)],
      count: 1,
    });
  });

  test("closest finds self", async () => {
    const div = document.createElement("div");
    document.body.append(div);
    const result = await brick.run(
      unsafeAssumeValidArg({
        selector: "div",
        traversal: "closest",
      }),
      brickOptionsFactory({ root: div }),
    );

    expect(result).toStrictEqual({
      elements: [getReferenceForElement(div)],
      count: 1,
    });
  });
});
