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

import { ErrorObject } from "serialize-error";
import { flattenStackForRollbar } from "./logging";

function errorFromStack(stack: string, cause?: ErrorObject): ErrorObject {
  const [type, message] = stack.split(/[\n:]/);
  return { type, message, stack, cause };
}

const stacks = [
  "ContextError: High level error\n    at someFunction (charizard.js:1:1)",
  "Error: Medium level error\n    at otherFunction (charmeleon.js:1:1)",
  "TypeError: Low level error\n    at atob (charmander.js:1:1)",
];

describe("flattenStackForRollbar", () => {
  test("preserves the stack unchanged if there's no cause", () => {
    expect(flattenStackForRollbar(stacks[0])).toMatchInlineSnapshot(`
      "ContextError: High level error
          at someFunction (charizard.js:1:1)"
    `);
  });
  test("appends the stack from the cause", () => {
    expect(flattenStackForRollbar(stacks[0], errorFromStack(stacks[1])))
      .toMatchInlineSnapshot(`
        "ContextError: High level error
            at someFunction (charizard.js:1:1)
            at CAUSED (BY.js:0:0) Error:-Medium-level-error
            at otherFunction (charmeleon.js:1:1)"
      `);
  });
  test("appends the stack from the cause 2", () => {
    expect(
      flattenStackForRollbar(
        stacks[0],
        errorFromStack(stacks[1], errorFromStack(stacks[2]))
      )
    ).toMatchInlineSnapshot(`
      "ContextError: High level error
          at someFunction (charizard.js:1:1)
          at CAUSED (BY.js:0:0) Error:-Medium-level-error
          at otherFunction (charmeleon.js:1:1)
          at CAUSED (BY.js:0:0) TypeError:-Low-level-error
          at atob (charmander.js:1:1)"
    `);
  });
});
