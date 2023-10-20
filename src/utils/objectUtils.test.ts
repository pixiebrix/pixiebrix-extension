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

import { removeUndefined, mapObject } from "@/utils/objectUtils";

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
    const result: Record<string, number> = mapObject(
      { foo: "bar", baz: "qux" },
      callback
    );
    expect(result).toStrictEqual({
      foo: 98,
      baz: 113,
    });
  });
});
