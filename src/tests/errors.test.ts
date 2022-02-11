import {
  BusinessError,
  CancelError,
  ContextError,
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

const TEST_MESSAGE = "Test message";

function nest(error: Error, level = 1): Error {
  if (level === 0) {
    return error;
  }

  return nest(new ContextError(error), level - 1);
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

  it("wraps primitize", () => {
    const error = selectError("test");
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toEqual(error.message);
  });
});
