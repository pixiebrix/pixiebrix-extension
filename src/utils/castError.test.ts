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
  it("should return an error if the input is an error", () => {
    const err = new Error("test error");
    expect(castError(err)).toBe(err);
  });

  it("should return an error if the input is a string", () => {
    const err = "test error";
    expect(castError(err)).toBeInstanceOf(Error);
    expect(castError(err).message).toBe(err);
  });

  it("should return an error if the input is a number", () => {
    const err = 42;
    expect(castError(err)).toBeInstanceOf(Error);
    expect(castError(err).message).toBe(String(err));
  });

  it("should return an error if the input is an object", () => {
    const err = { message: "test error" };
    expect(castError(err)).toBeInstanceOf(Error);
    expect(castError(err).message).toBe(JSON.stringify(err));
  });

  it("should return an error if the input is null", () => {
    const err = null;
    expect(castError(err)).toBeInstanceOf(Error);
    expect(castError(err).message).toBe("");
  });

  it("should return an error with the default message if the input is null", () => {
    const err = null;
    const defaultMessage = "default message";
    expect(castError(err, defaultMessage)).toBeInstanceOf(Error);
    expect(castError(err, defaultMessage).message).toBe(defaultMessage);
  });

  it("should return an error if the input is undefined", () => {
    const err = undefined;
    expect(castError(err)).toBeInstanceOf(Error);
    expect(castError(err).message).toBe("");
  });

  it("should return an error with the default message if the input is undefined", () => {
    const err = null;
    const defaultMessage = "default message";
    expect(castError(err, defaultMessage)).toBeInstanceOf(Error);
    expect(castError(err, defaultMessage).message).toBe(defaultMessage);
  });

  it("should return an error if the input is a boolean", () => {
    const err = true;
    expect(castError(err)).toBeInstanceOf(Error);
    expect(castError(err).message).toBe(String(err));
  });

  it("should return formatted error when casting error fails", () => {
    const err = {
      toJSON() {
        throw new Error("test error");
      },
    };
    const defaultMessage = "default message";
    expect(castError(err, defaultMessage)).toBeInstanceOf(Error);
    expect(castError(err, defaultMessage).message).toBe(
      `Error casting error: ${defaultMessage}, type: object`,
    );
  });
});
