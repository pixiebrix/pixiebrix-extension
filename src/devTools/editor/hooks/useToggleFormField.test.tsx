/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { removeField } from "@/devTools/editor/hooks/useToggleFormField";

describe("removeField", () => {
  test("remove field from object", () => {
    const obj = { foo: "foo", bar: "bar" };
    removeField(obj, "bar");
    expect(obj).toStrictEqual({ foo: "foo" });
  });

  test("remove item from array", () => {
    const array = ["foo", "bar", "baz"];
    removeField(array, "1");
    expect(array).toStrictEqual(["foo", "baz"]);
  });

  test("try to remove field from non-object", () => {
    const foo = 42;
    removeField(foo, "bar");
    expect(foo).toStrictEqual(42);
  });
});
