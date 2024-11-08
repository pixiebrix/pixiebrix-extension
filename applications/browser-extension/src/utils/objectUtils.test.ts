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

import {
  removeUndefined,
  mapObject,
  isUnknownObjectArray,
  assertObject,
} from "./objectUtils";
import { BusinessError } from "@/errors/businessErrors";

describe("removeUndefined", () => {
  test("remove top-level undefined", () => {
    expect(removeUndefined({ foo: undefined, bar: null })).toStrictEqual({
      bar: null,
    });
  });
  test("remove nested undefined", () => {
    expect(removeUndefined({ foo: { bar: undefined } })).toStrictEqual({
      foo: {},
    });
  });
});

describe("mapObject", () => {
  test("callback arguments", () => {
    const callback = jest.fn();
    mapObject({ foo: "bar" }, callback);
    expect(callback).toHaveBeenCalledWith("bar", "foo");
  });

  test("callback called for each key", () => {
    const callback = jest.fn();
    mapObject({ foo: "bar", baz: "qux" }, callback);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  test("the callback alters the type of the Record", () => {
    const callback = (value: string) => value.codePointAt(0);
    const result = mapObject({ foo: "bar", baz: "qux" }, callback);
    expect(result).toStrictEqual({
      foo: 98,
      baz: 113,
    });
  });
});

describe("isUnknownObjectArray", () => {
  test("empty array", () => {
    expect(isUnknownObjectArray([])).toBe(true);
  });

  test("array of objects", () => {
    expect(isUnknownObjectArray([{ foo: "bar" }])).toBe(true);
  });

  test("array of arrays", () => {
    expect(
      isUnknownObjectArray([
        [1, 2, 3],
        [4, 5, 6],
      ]),
    ).toBe(true);
  });

  test("array of non-objects", () => {
    expect(isUnknownObjectArray([1, 2, 3])).toBe(false);
  });

  test("non-array", () => {
    expect(isUnknownObjectArray({ foo: "bar" })).toBe(false);
  });
});

describe("assertObject", () => {
  it("accepts an array", () => {
    expect(() => {
      assertObject([]);
    }).not.toThrow();
  });

  it("accepts an object", () => {
    expect(() => {
      assertObject({ foo: "bar" });
    }).not.toThrow();
  });

  it.each([null, undefined])("rejects nullish: %s", (value) => {
    expect(() => {
      assertObject(value);
    }).toThrow(TypeError);
  });

  it("throws custom error", () => {
    expect(() => {
      assertObject(42, BusinessError);
    }).toThrow(BusinessError);
  });
});
