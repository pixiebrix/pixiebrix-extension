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

import VarMap, { mergeExistenceMaps, VarExistence } from "./varMap";

describe("VarMap", () => {
  let varMap: VarMap;
  beforeEach(() => {
    varMap = new VarMap();
  });

  test.each(["foo.bar", "foo", 'foo["bar baz"].qux[0]'])(
    "get the exact known var (%s)",
    (varName) => {
      varMap.setExistence(varName, VarExistence.DEFINITELY);
      const actual = varMap.getExistence(varName);

      expect(actual).toBe(VarExistence.DEFINITELY);
    }
  );

  test.each([VarExistence.MAYBE, VarExistence.DEFINITELY])(
    "gets nested existence (%s)",
    (existence) => {
      varMap.setExistence("foo.bar", existence);
      expect(varMap.getExistence("foo.bar")).toBe(existence);
      expect(varMap.getExistence("foo.baz")).toBeUndefined();
    }
  );

  test.each([VarExistence.MAYBE, VarExistence.DEFINITELY])(
    "gets nested existence 2 (%s)",
    (existence) => {
      varMap.setExistence('foo["bar baz"].qux', existence);
      expect(varMap.getExistence('foo["bar baz"]')).toBe(existence);
      expect(varMap.getExistence("foo")).toBe(existence);
    }
  );

  test("get a child property of a container with any schema", () => {
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

  test("set existence from context obj with parent specified", () => {
    varMap.setExistence("foo", VarExistence.DEFINITELY);
    varMap.setExistenceFromObj(
      {
        qux: "quux",
      },
      "bar.baz"
    );

    expect(varMap.getExistence("foo")).toBe(VarExistence.DEFINITELY);
    expect(varMap.getExistence("bar.baz.qux")).toBe(VarExistence.DEFINITELY);
  });

  test("clones a var map", () => {
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

  test("doesn't override a var with nested keys", () => {
    // Set nested keys
    varMap.setExistence("foo.bar", VarExistence.DEFINITELY);

    // Try to override the parent key
    varMap.setExistence("foo", VarExistence.MAYBE);

    expect(varMap.getExistence("foo.bar")).toBe(VarExistence.DEFINITELY);
  });

  test("doesn't override a DEFINITELY var with MAYBE", () => {
    varMap.setExistence("foo", VarExistence.DEFINITELY);
    varMap.setExistence("foo", VarExistence.MAYBE);

    expect(varMap.getExistence("foo")).toBe(VarExistence.DEFINITELY);
  });
});

describe("VarMap meta", () => {
  test("sets source to undefined var", () => {
    const varMap = new VarMap();
    varMap.setSource("@foo", "bar");

    expect(varMap.getMeta("@foo").source).toBe("bar");
    expect(varMap.getExistence("@foo")).toBeUndefined();
  });

  test.each([VarExistence.MAYBE, VarExistence.DEFINITELY])(
    "sets source to an existing var (%s)",
    (existence) => {
      const varMap = new VarMap();
      varMap.setExistence("@foo.bar", existence);
      varMap.setSource("@foo.bar", "baz");

      expect(varMap.getMeta("@foo.bar").source).toBe("baz");
      expect(varMap.getExistence("@foo.bar")).toBe(existence);
    }
  );
});

describe("mergeExistenceMaps", () => {
  test("works with nulls", () => {
    const actual = mergeExistenceMaps(null, null);
    expect(actual).toEqual({});
  });

  test("merges plain maps", () => {
    const actual = mergeExistenceMaps(
      {
        foo: VarExistence.DEFINITELY,
      },
      {
        bar: VarExistence.DEFINITELY,
      }
    );
    expect(actual).toEqual({
      foo: VarExistence.DEFINITELY,
      bar: VarExistence.DEFINITELY,
    });
  });

  test("merges nested maps", () => {
    const actual = mergeExistenceMaps(
      { foo: { bar: VarExistence.DEFINITELY } },
      { foo: { baz: VarExistence.DEFINITELY } }
    );
    expect(actual).toEqual({
      foo: {
        bar: VarExistence.DEFINITELY,
        baz: VarExistence.DEFINITELY,
      },
    });
  });

  test("merges Existence with an object", () => {
    const mapA = { foo: { bar: VarExistence.DEFINITELY } };
    const mapB = { foo: VarExistence.DEFINITELY };
    const expected = {
      foo: {
        bar: VarExistence.DEFINITELY,
      },
    };

    const actualAB = mergeExistenceMaps(mapA, mapB);
    expect(actualAB).toEqual(expected);

    const actualBA = mergeExistenceMaps(mapB, mapA);
    expect(actualBA).toEqual(expected);
  });

  test("overrides the existence with more strict one regardless of the order", () => {
    const mapA = { foo: { bar: VarExistence.DEFINITELY } };
    const mapB = { foo: { bar: VarExistence.MAYBE } };
    const expected = { foo: { bar: VarExistence.DEFINITELY } };

    const actualAB = mergeExistenceMaps(mapA, mapB);
    expect(actualAB).toEqual(expected);

    const actualBA = mergeExistenceMaps(mapB, mapA);
    expect(actualBA).toEqual(expected);
  });
});
