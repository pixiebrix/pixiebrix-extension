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

import {
  formatIOValidationMessage,
  getErrorMessage,
} from "@/errors/errorHelpers";
import type { InputValidationError } from "@/bricks/errors";

describe("getErrorMessage", () => {
  test("if no error, return default message", () => {
    const expectedMessage = "default message";
    const message = getErrorMessage(undefined, expectedMessage);
    expect(message).toEqual(expectedMessage);
  });

  test("if string error, return error", () => {
    const expectedMessage = "error message";
    const message = getErrorMessage(expectedMessage, "default message");
    expect(message).toEqual(expectedMessage);
  });

  test("if error object, return error message", () => {
    const errorObject = { message: "error message" };
    const message = getErrorMessage(errorObject, "default message");
    expect(message).toEqual(errorObject.message);
  });

  test("if InputValidationError, prefer error message", () => {
    const inputValidationError = {
      message: "error message",
      errors: [{ error: "error", keywordLocation: "#/foo" }],
    } as InputValidationError;
    const message = getErrorMessage(inputValidationError, "default message");
    expect(message).toEqual(inputValidationError.message);
  });

  test("if InputValidationError with no message, return first error", () => {
    const firstError = { error: "error", keywordLocation: "#/foo" };
    const inputValidationError = {
      errors: [firstError],
    } as InputValidationError;
    const message = getErrorMessage(inputValidationError, "default message");
    expect(message).toEqual(
      `${firstError.keywordLocation}: ${firstError.error}`
    );
  });
});

const validationError = {
  keywordLocation: "#/foo",
  error: "Property bar does not match schema",
} as InputValidationError["errors"][0];

describe("formatIOValidationMessage", () => {
  test("it returns a message in the form of 'keywordLocation: error'", () => {
    const message = formatIOValidationMessage(validationError);
    expect(message).toEqual(
      `${validationError.keywordLocation}: ${validationError.error}`
    );
  });

  test("it returns just the error if no keyword location", () => {
    const message = formatIOValidationMessage({
      ...validationError,
      keywordLocation: undefined,
    });
    expect(message).toEqual(validationError.error);
  });

  test("it returns empty string if no error or keyword location", () => {
    const message = formatIOValidationMessage(
      {} as InputValidationError["errors"][0]
    );
    expect(message).toEqual("");
  });
});
