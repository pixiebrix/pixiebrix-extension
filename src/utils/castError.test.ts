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

import castError from "@/utils/castError";

describe("castError", () => {
  const defaultMessage = "default message";

  it("should return an error if the input is an error", () => {
    const err = new Error("test error");
    expect(castError(err, defaultMessage)).toBe(err);
  });

  it.each([
    ["a string", "test error"],
    ["a number", 42],
    ["a boolean", true],
    ["null", null],
    ["undefined", undefined],
    ["an object", { message: "test error" }],
    ["an array", ["test error"]],
  ])("should return an error if the input is %s", (_, error) => {
    const result = castError(error, defaultMessage);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe(defaultMessage);
    expect(result.cause).toBe(error);
  });
});
