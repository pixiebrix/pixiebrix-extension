import {
  BusinessError,
  CancelError,
  ContextError,
  ErrorWithCause,
  getErrorMessage,
  hasBusinessRootCause,
  hasCancelRootCause,
  isErrorObject,
  MultipleElementsFoundError,
  NoElementsFoundError,
  selectError,
} from "@/errors";
import { range } from "lodash";
import { deserializeError, serializeError } from "serialize-error";
import { InputValidationError, OutputValidationError } from "@/blocks/errors";
import regexJoin from "regex-join";

// eslint-disable-next-line security/detect-unsafe-regex -- Tests only
const stackTraceRegex = /(\n\s+at [^\n]+)+\n?/;

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

describe("ErrorWithCause", () => {
  test("concats error messages", () => {
    const error = new ErrorWithCause("Error while connecting", {
      cause: new Error("Not connected to internet"),
    });
    expect(error.message).toBe(
      "Error while connecting: Not connected to internet"
    );
  });

  test("concats error stacks", () => {
    const error = new ErrorWithCause("Error while connecting", {
      cause: new Error("Not connected to internet"),
    });
    expect(error.stack).toMatch(
      regexJoin(
        "Error: Error while connecting: Not connected to internet",
        stackTraceRegex,
        "caused by: Error: Not connected to internet",
        stackTraceRegex
      )
    );
  });
  test("supports non-Error causes without throwing", () => {
    expect(new ErrorWithCause("Error while connecting")).toMatchInlineSnapshot(
      "[Error: Error while connecting]"
    );
    expect(
      new ErrorWithCause("Error while connecting", {
        cause: null,
      })
    ).toMatchInlineSnapshot("[Error: Error while connecting]");
    expect(
      new ErrorWithCause("Error while connecting", {
        cause: "No internet connection",
      })
    ).toMatchInlineSnapshot(
      "[Error: Error while connecting: No internet connection]"
    );
    expect(
      new ErrorWithCause("Error while connecting", {
        cause: { response: "No internet connection" },
      })
    ).toMatchInlineSnapshot(
      '[Error: Error while connecting: {"response":"No internet connection"}]'
    );
  });
});

describe("ContextError", () => {
  test("concats error messages", () => {
    const error = new ContextError("Error while connecting", {
      cause: new Error("Not connected to internet"),
    });
    expect(error.message).toBe(
      "Error while connecting: Not connected to internet"
    );
  });

  test("concats error stacks", () => {
    const error = new ContextError("Error while connecting", {
      cause: new Error("Not connected to internet"),
    });
    expect(error.stack).toMatch(
      regexJoin(
        "Error: Error while connecting: Not connected to internet",
        stackTraceRegex,
        "caused by: Error: Not connected to internet",
        stackTraceRegex
      )
    );
  });
  test("supports non-Error causes without throwing", () => {
    expect(
      new ContextError("Error while connecting", {
        cause: "No internet connection",
      })
    ).toMatchInlineSnapshot(
      "[ContextError: Error while connecting: No internet connection]"
    );
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

  it("wraps primitive from ErrorEvent and creates stack", () => {
    const error = "It’s a non-error";
    const errorEvent = new ErrorEvent("error", {
      filename: "yoshi://mushroom-kingdom/bowser.js",
      lineno: 2,
      colno: 10,
      error,
    });

    const selectedError = selectError(errorEvent);
    expect(selectedError).toMatchInlineSnapshot(
      "[Error: Synchronous error: It’s a non-error]"
    );
    expect(selectedError.stack).toMatchInlineSnapshot(`
      "Error: Synchronous error: It’s a non-error
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

  it("wraps primitive from PromiseRejectionEvent", () => {
    const errorEvent = new PromiseRejectionEvent(
      "error",
      createUncaughtRejection("It’s a non-error")
    );

    expect(selectError(errorEvent)).toMatchInlineSnapshot(
      "[Error: Asynchronous error: It’s a non-error]"
    );
  });
});
