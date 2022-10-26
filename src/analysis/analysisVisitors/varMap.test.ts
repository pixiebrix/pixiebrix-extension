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

import VarMap, { VarExistence } from "./varMap";

let varMap: VarMap;
beforeEach(() => {
  varMap = new VarMap();
});

test.each(["foo.bar", "foo"])("get the exact know var (%s)", (varName) => {
  varMap.setExistence(varName, VarExistence.DEFINITELY);
  const actual = varMap.getExistence(varName);

  expect(actual).toBe(VarExistence.DEFINITELY);
});

test("gets nested existence", () => {
  varMap.setExistence("foo.bar", VarExistence.DEFINITELY);
  expect(varMap.getExistence("foo.bar")).toBe(VarExistence.DEFINITELY);
  expect(varMap.getExistence("foo.baz")).toBeUndefined();
});

test("get a DEFINITELY property of a known container", () => {
  varMap.setExistence("foo.bar", VarExistence.DEFINITELY);
  const actual = varMap.getExistence("foo");

  expect(actual).toBe(VarExistence.DEFINITELY);
});

test("get a MAYBE property of a known container", () => {
  varMap.setExistence("foo.*", VarExistence.MAYBE);
  const actual = varMap.getExistence("foo.bar");

  expect(actual).toBe(VarExistence.MAYBE);
});

test("set existence from context obj", () => {
  varMap.setExistenceFromObj({
    foo: {
      bar: "baz",
    },
    qux: "quux",
  });

  expect(varMap.getExistence("foo")).toBe(VarExistence.DEFINITELY);
  expect(varMap.getExistence("foo.bar")).toBe(VarExistence.DEFINITELY);
  expect(varMap.getExistence("baz")).toBeUndefined();
  expect(varMap.getExistence("qux")).toBe(VarExistence.DEFINITELY);
  expect(varMap.getExistence("quux")).toBeUndefined();
});

test("clones a var map", () => {
  const varMap = new VarMap();
  varMap.setExistence("foo", VarExistence.DEFINITELY);

  const clone = varMap.clone();
  clone.setExistence("bar", VarExistence.DEFINITELY);

  expect(varMap.getExistence("foo")).toBe(VarExistence.DEFINITELY);
  expect(varMap.getExistence("bar")).toBeUndefined();

  expect(clone.getExistence("foo")).toBe(VarExistence.DEFINITELY);
  expect(clone.getExistence("bar")).toBe(VarExistence.DEFINITELY);
});

test("merges 2 var maps", () => {
  const varMap1 = new VarMap();
  varMap1.setExistence("foo.bar", VarExistence.DEFINITELY);
  varMap1.setExistence("qux", VarExistence.DEFINITELY);

  const varMap2 = new VarMap();
  varMap2.setExistence("foo.baz", VarExistence.DEFINITELY);
  varMap2.setExistence("quux", VarExistence.DEFINITELY);

  const merged = varMap1.merge(varMap2);
  expect(merged).toEqual({
    map: {
      foo: {
        bar: VarExistence.DEFINITELY,
        baz: VarExistence.DEFINITELY,
      },
      qux: VarExistence.DEFINITELY,
      quux: VarExistence.DEFINITELY,
    },
  });
});

test("merged map is a separate object", () => {
  const varMap1 = new VarMap();
  varMap1.setExistence("foo.bar", VarExistence.DEFINITELY);

  const merged = varMap1.merge(new VarMap());
  merged.setExistence("foo.baz", VarExistence.DEFINITELY);

  expect(varMap1.getExistence("foo.bar")).toBe(VarExistence.DEFINITELY);
  expect(varMap1.getExistence("foo.baz")).toBeUndefined();

  expect(merged.getExistence("foo.bar")).toBe(VarExistence.DEFINITELY);
  expect(merged.getExistence("foo.baz")).toBe(VarExistence.DEFINITELY);
});
