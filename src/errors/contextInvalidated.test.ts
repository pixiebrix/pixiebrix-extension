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

import { isContextInvalidatedError } from "@/errors/contextInvalidated";

describe("isContextInvalidatedError", () => {
  const invalidated = new Error("Extension context invalidated.");
  const unrelated = new Error("The ticket was not invalidated");
  test("base test", () => {
    expect(isContextInvalidatedError(invalidated)).toBeTrue();
    expect(
      isContextInvalidatedError(new Error("Parent", { cause: invalidated }))
    ).toBeTrue();

    expect(isContextInvalidatedError(unrelated)).toBeFalse();
    expect(
      isContextInvalidatedError(new Error("Parent", { cause: unrelated }))
    ).toBeFalse();
  });
});
