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
  BusinessError,
  CancelError,
  ContextError,
  getErrorMessage,
  hasBusinessRootCause,
  hasCancelRootCause,
  IGNORED_ERROR_PATTERNS,
  isErrorObject,
  MultipleElementsFoundError,
  NoElementsFoundError,
  selectError,
  serializePixiebrixError,
} from "@/errors";
import { range } from "lodash";
import { deserializeError, serializeError } from "serialize-error";
import { InputValidationError, OutputValidationError } from "@/blocks/errors";
import { matchesAnyPattern } from "@/utils";
import { isPlainObject } from "@reduxjs/toolkit";

const TEST_MESSAGE = "Test message";

function createUncaughtRejection(reason: string | Error) {
  const promise = Promise.reject(reason);
  // eslint-disable-next-line promise/prefer-await-to-then -- Test only
  promise.catch(() => {}); // Or else it will crash Node
  return { promise, reason };
}

function nest(error: Error, level = 1): Error {
  if (level === 0) {
    return error;
  }

  return nest(
    new ContextError("Something happened", { cause: error }),
    level - 1
  );
}

describe("hasCancelRootCause", () => {
  test("can detect cancel root cause", () => {
    const error = new CancelError(TEST_MESSAGE);
    for (const level of range(3)) {
      expect(hasCancelRootCause(nest(error, level))).toBe(true);
    }
  });

  test("do not detect other causes", () => {
    const error = new Error(TEST_MESSAGE);
    for (const level of range(3)) {
      expect(hasCancelRootCause(nest(error, level))).toBe(false);
    }
  });

  test("handles message", () => {
    expect(hasCancelRootCause(TEST_MESSAGE)).toBe(false);
  });

  test("can detect cancel root cause in serialized error", () => {
    const error = new CancelError(TEST_MESSAGE);
    for (const level of range(3)) {
      expect(hasCancelRootCause(serializeError(nest(error, level)))).toBe(true);
    }
  });

  test("handles other serialized errors", () => {
    const error = new Error(TEST_MESSAGE);
    for (const level of range(3)) {
      expect(hasCancelRootCause(serializeError(nest(error, level)))).toBe(
        false
      );
    }
  });
});

describe("hasBusinessRootCause", () => {
  const errorTable = [
    new BusinessError(TEST_MESSAGE),
    new NoElementsFoundError("#test"),
    new MultipleElementsFoundError("#test"),
    new InputValidationError(TEST_MESSAGE, { type: "string" }, 42, []),
    new OutputValidationError(TEST_MESSAGE, { type: "string" }, 42, []),
  ].map((error) => ({ error, name: error.name }));

  test("can detect business root cause", () => {
    const error = new BusinessError(TEST_MESSAGE);
    for (const level of range(3)) {
      expect(hasBusinessRootCause(nest(error, level))).toBe(true);
    }
  });

  test("do not detect other causes", () => {
    const error = new Error(TEST_MESSAGE);
    expect(hasBusinessRootCause(error)).toBe(false);
    for (const level of range(3)) {
      expect(hasBusinessRootCause(nest(error, level))).toBe(false);
    }
  });

  test("handles message", () => {
    expect(hasBusinessRootCause(TEST_MESSAGE)).toBe(false);
  });

  test.each(errorTable)("can detect subclass $name", ({ error }) => {
    for (const level of range(3)) {
      expect(hasBusinessRootCause(nest(error, level))).toBe(true);
    }
  });

  test.each(errorTable)("can detect serialized error $name", ({ error }) => {
    for (const level of range(3)) {
      expect(hasBusinessRootCause(serializeError(nest(error, level)))).toBe(
        true
      );
    }
  });

  test.each(errorTable)("can detect deserialized error $name", ({ error }) => {
    for (const level of range(3)) {
      const deserialized = deserializeError(serializeError(nest(error, level)));
      expect(hasBusinessRootCause(deserialized)).toBe(true);
    }
  });

  test("handles serialized errors", () => {
    const error = new Error(TEST_MESSAGE);
    for (const level of range(3)) {
      expect(hasBusinessRootCause(serializeError(nest(error, level)))).toBe(
        false
      );
    }
  });
});

describe("getErrorMessage", () => {
  test("handles string", () => {
    expect(getErrorMessage(TEST_MESSAGE)).toBe(TEST_MESSAGE);
  });

  test("handles vanilla error", () => {
    expect(getErrorMessage(new Error(TEST_MESSAGE))).toBe(TEST_MESSAGE);
  });

  test("handles null/undefined", () => {
    expect(getErrorMessage(null)).toBe("Unknown error");
    // eslint-disable-next-line unicorn/no-useless-undefined -- testing value since it comes from variable/expression in the wild
    expect(getErrorMessage(undefined)).toBe("Unknown error");
  });
});

describe("isErrorObject", () => {
  test("handles error", () => {
    expect(isErrorObject(new Error(TEST_MESSAGE))).toBe(true);
  });

  test("handles primitives", () => {
    expect(isErrorObject(null)).toBe(false);
    expect(isErrorObject(TEST_MESSAGE)).toBe(false);
  });
});

describe("selectError", () => {
  it("passes through error", () => {
    const error = new Error("test");
    expect(selectError(error)).toBe(error);
  });

  it("deserializes error object", () => {
    const error = new Error("test");
    expect(selectError(serializeError(error))).toBeInstanceOf(Error);
    expect(serializeError(selectError(serializeError(error)))).toStrictEqual(
      serializeError(error)
    );
  });

  it("wraps primitive", () => {
    // eslint-disable-next-line unicorn/no-useless-undefined -- Required by the types
    expect(selectError(undefined)).toMatchInlineSnapshot("[Error: undefined]");
    expect(selectError(null)).toMatchInlineSnapshot("[Error: null]");
    expect(selectError(123)).toMatchInlineSnapshot("[Error: 123]");
    expect(selectError("test")).toMatchInlineSnapshot("[Error: test]");
    expect(selectError({ my: "object" })).toMatchInlineSnapshot(
      '[Error: {"my":"object"}]'
    );
  });

  it("extracts error from ErrorEvent", () => {
    const error = new Error("This won’t be caught");
    const errorEvent = new ErrorEvent("error", {
      error,
    });

    expect(selectError(errorEvent)).toBe(error);
  });

  it("handles ErrorEvent with null message and error", () => {
    const errorEvent = new ErrorEvent("error", {
      error: null,
      message: null,
    });

    const selectedError = selectError(errorEvent);
    expect(selectedError).toMatchInlineSnapshot("[Error: Unknown error event]");
  });

  it("handles error event with message but no error object", () => {
    const eventMessage = "ResizeObserver loop limit exceeded";

    // Seen on Chrome 100.0.4896.127. The message is provided, but there's no error object
    const errorEvent = new ErrorEvent("error", {
      filename: "https://dashboard.brex.com/card/transactions/yours",
      lineno: 0,
      colno: 10,
      error: null,
      message: eventMessage,
    });

    const selectedError = selectError(errorEvent);

    expect(selectedError.message).toBe(eventMessage);

    // This particular error should be ignored by recordError because it's in the IGNORED_ERROR_PATTERNS. Check here
    // that the error message matches one of the ignored patterns.
    const message = getErrorMessage(selectedError);
    expect(matchesAnyPattern(message, IGNORED_ERROR_PATTERNS)).toBeTruthy();
  });

  it("wraps primitive from ErrorEvent and creates stack", () => {
    const error = "It’s a non-error";
    const errorEvent = new ErrorEvent("error", {
      filename: "yoshi://mushroom-kingdom/bowser.js",
      lineno: 2,
      colno: 10,
      error,
    });

    const selectedError = selectError(errorEvent);
    expect(selectedError).toMatchInlineSnapshot("[Error: It’s a non-error]");
    expect(selectedError.stack).toMatchInlineSnapshot(`
      "Error: It’s a non-error
          at unknown (yoshi://mushroom-kingdom/bowser.js:2:10)"
    `);
  });

  it("extracts error from PromiseRejectionEvent", () => {
    const error = new Error("This won’t be caught");
    const errorEvent = new PromiseRejectionEvent(
      "error",
      createUncaughtRejection(error)
    );

    expect(selectError(errorEvent)).toBe(error);
  });

  it("handles PromiseRejectionEvent with null reason", () => {
    const errorEvent = new PromiseRejectionEvent(
      "error",
      createUncaughtRejection(null)
    );

    const selectedError = selectError(errorEvent);
    expect(selectedError).toMatchInlineSnapshot(
      "[Error: Unknown promise rejection]"
    );
  });

  it("wraps primitive from PromiseRejectionEvent", () => {
    const errorEvent = new PromiseRejectionEvent(
      "error",
      createUncaughtRejection("It’s a non-error")
    );

    expect(selectError(errorEvent)).toMatchInlineSnapshot(
      "[Error: It’s a non-error]"
    );
  });
});

describe("serializatin", () => {
  test("serializes error cause", () => {
    const inputValidationError = new InputValidationError(
      "test input validation error",
      null,
      null,
      []
    );
    const contextError = new ContextError("text context error", {
      cause: inputValidationError,
    });

    const serializedError = serializePixiebrixError(contextError);

    expect(isPlainObject(serializedError)).toBeTruthy();
    expect(isPlainObject(serializedError.cause)).toBeTruthy();
  });
});
