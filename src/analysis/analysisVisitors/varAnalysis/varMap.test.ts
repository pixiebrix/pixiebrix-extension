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

import VarMap, {
  ALLOW_ANY_CHILD,
  IS_ARRAY,
  SELF_EXISTENCE,
  VarExistence,
} from "./varMap";

describe("setExistence", () => {
  test("sets the existence", () => {
    const varMap = new VarMap();
    varMap.setExistence({
      source: "brick1",
      path: "@foo",
      existence: VarExistence.DEFINITELY,
    });
    expect(varMap.isVariableDefined("@foo")).toBeTrue();
  });

  test("doesn't override DEFINITELY with MAYBE", () => {
    const varMap = new VarMap();
    varMap.setExistence({
      source: "brick1",
      path: "@foo",
      existence: VarExistence.DEFINITELY,
    });
    varMap.setExistence({
      source: "brick1",
      path: "@foo",
      existence: VarExistence.MAYBE,
    });

    const map = varMap.getMap();
    expect(map.brick1["@foo"][SELF_EXISTENCE]).toBe(VarExistence.DEFINITELY);
  });

  test("overrides MAYBE with DEFINITELY", () => {
    const varMap = new VarMap();
    varMap.setExistence({
      source: "brick1",
      path: "@foo",
      existence: VarExistence.MAYBE,
    });
    varMap.setExistence({
      source: "brick1",
      path: "@foo",
      existence: VarExistence.DEFINITELY,
    });

    const map = varMap.getMap();
    expect(map.brick1["@foo"][SELF_EXISTENCE]).toBe(VarExistence.DEFINITELY);
  });

  test("sets a nested key", () => {
    const varMap = new VarMap();
    varMap.setExistence({
      source: "brick1",
      path: "@foo.bar",
      existence: VarExistence.DEFINITELY,
    });
    expect(varMap.isVariableDefined("@foo.bar")).toBeTrue();
  });

  test("overrides nested MAYBE for DEFINITELY", () => {
    const varMap = new VarMap();
    varMap.setExistence({
      source: "brick1",
      path: "@foo.baz",
      existence: VarExistence.MAYBE,
    });

    varMap.setExistence({
      source: "brick1",
      path: "@foo.bar",
      existence: VarExistence.MAYBE,
    });
    expect(varMap.getMap()).toEqual({
      brick1: {
        [SELF_EXISTENCE]: VarExistence.MAYBE,
        [ALLOW_ANY_CHILD]: false,
        [IS_ARRAY]: false,
        "@foo": {
          bar: {
            [SELF_EXISTENCE]: VarExistence.MAYBE,
            [ALLOW_ANY_CHILD]: false,
            [IS_ARRAY]: false,
          },
          baz: {
            [SELF_EXISTENCE]: VarExistence.MAYBE,
            [ALLOW_ANY_CHILD]: false,
            [IS_ARRAY]: false,
          },
          [SELF_EXISTENCE]: VarExistence.MAYBE,
          [ALLOW_ANY_CHILD]: false,
          [IS_ARRAY]: false,
        },
      },
    });

    // VarMap updates the existence of target node and all its parents
    varMap.setExistence({
      source: "brick1",
      path: "@foo.bar",
      existence: VarExistence.DEFINITELY,
    });
    expect(varMap.getMap()).toEqual({
      brick1: {
        [SELF_EXISTENCE]: VarExistence.DEFINITELY,
        [ALLOW_ANY_CHILD]: false,
        [IS_ARRAY]: false,
        "@foo": {
          bar: {
            [SELF_EXISTENCE]: VarExistence.DEFINITELY,
            [ALLOW_ANY_CHILD]: false,
            [IS_ARRAY]: false,
          },
          // This node stays unchanged
          baz: {
            [SELF_EXISTENCE]: VarExistence.MAYBE,
            [ALLOW_ANY_CHILD]: false,
            [IS_ARRAY]: false,
          },
          [SELF_EXISTENCE]: VarExistence.DEFINITELY,
          [ALLOW_ANY_CHILD]: false,
          [IS_ARRAY]: false,
        },
      },
    });
  });

  test("validates arrays", () => {
    const varMap = new VarMap();

    varMap.setExistence({
      source: "brick1",
      path: "@foo",
      existence: VarExistence.DEFINITELY,
      isArray: true,
    });

    // Items of the array are defined
    expect(varMap.isVariableDefined("@foo.0")).toBeTrue();
    expect(varMap.isVariableDefined("@foo.100")).toBeTrue();

    // Unknown property of the array is not defined
    expect(varMap.isVariableDefined("@foo.bar")).toBeFalse();
  });

  test("validates arrays of objects", () => {
    const varMap = new VarMap();

    varMap.setExistence({
      source: "brick1",
      path: "@foo",
      existence: VarExistence.DEFINITELY,
      isArray: true,
    });

    varMap.setExistence({
      source: "brick1",
      path: "@foo.bar",
      existence: VarExistence.DEFINITELY,
    });

    // Item of the array is defined
    expect(varMap.isVariableDefined("@foo.0")).toBeTrue();
    // Known property of the array item is defined
    expect(varMap.isVariableDefined("@foo.0.bar")).toBeTrue();

    // Unknown property of the array item is not defined
    expect(varMap.isVariableDefined("@foo.0.baz")).toBeFalse();
    // Unknown property of the array is not defined
    expect(varMap.isVariableDefined("@foo.qux")).toBeFalse();
  });
});

describe("setting output key", () => {
  // Use case: setting the existence for a block's output
  test("sets the existence", () => {
    const varMap = new VarMap();

    varMap.setOutputKeyExistence({
      source: "brick1",
      outputKey: "@foo",
      existence: VarExistence.DEFINITELY,
      allowAnyChild: false,
    });
    varMap.setOutputKeyExistence({
      source: "brick2",
      outputKey: "@bar",
      existence: VarExistence.DEFINITELY,
      allowAnyChild: false,
    });
    expect(varMap.isVariableDefined("@foo")).toBeTrue();
    expect(varMap.isVariableDefined("@bar")).toBeTrue();
  });

  // No real use case, just a functionality expectations
  test("overwrites any previous for the same source", () => {
    const varMap = new VarMap();
    varMap.setOutputKeyExistence({
      source: "brick1",
      outputKey: "@foo",
      existence: VarExistence.DEFINITELY,
      allowAnyChild: false,
    });

    varMap.setOutputKeyExistence({
      source: "brick1",
      outputKey: "@bar",
      existence: VarExistence.DEFINITELY,
      allowAnyChild: false,
    });

    expect(varMap.isVariableDefined("@foo")).toBeFalse();
    expect(varMap.isVariableDefined("@bar")).toBeTrue();
  });

  test.each([
    [true, true],
    [false, false],
  ])("works when allow any child = %s", (allowAnyChild, expectedExistence) => {
    const varMap = new VarMap();
    varMap.setOutputKeyExistence({
      source: "brick1",
      outputKey: "@foo",
      existence: VarExistence.DEFINITELY,
      allowAnyChild,
    });

    expect(varMap.isVariableDefined("@foo.bar")).toBe(expectedExistence);
  });
});

describe("setExistenceFromValues", () => {
  // Use case: setting the @input based on the page reader schema or adding existence from trace
  test("sets the existence for a plain object", () => {
    const values = {
      "@foo": "bar",
    };

    const varMap = new VarMap();
    varMap.setExistenceFromValues({ source: "brick1", values });

    expect(varMap.isVariableDefined("@foo")).toBeTrue();
    expect(varMap.isVariableDefined("@foo.bar")).toBeFalse();
  });

  test("sets the existence for a complex object", () => {
    const values = {
      foo: {
        bar: "baz",
      },
      qux: "quux",
    };

    const varMap = new VarMap();
    varMap.setExistenceFromValues({ source: "brick1", values });

    expect(varMap.isVariableDefined("foo")).toBeTrue();
    expect(varMap.isVariableDefined("foo.bar")).toBeTrue();
    expect(varMap.isVariableDefined("foo.bar.baz")).toBeFalse();
    expect(varMap.isVariableDefined("qux")).toBeTrue();
    expect(varMap.isVariableDefined("quux")).toBeFalse();
  });

  test("set existence from context obj with parent specified", () => {
    const varMap = new VarMap();
    varMap.setExistenceFromValues({
      source: "brick1",
      values: {
        qux: "quux",
      },
      parentPath: "bar.baz",
    });

    expect(varMap.isVariableDefined("bar.baz.qux")).toBeTrue();
  });
});

describe("cloning", () => {
  test("clones a var map", () => {
    const varMap = new VarMap();
    varMap.setOutputKeyExistence({
      source: "brick1",
      outputKey: "@foo",
      existence: VarExistence.DEFINITELY,
      allowAnyChild: false,
    });

    const clone = varMap.clone();
    clone.setOutputKeyExistence({
      source: "brick2",
      outputKey: "@bar",
      existence: VarExistence.DEFINITELY,
      allowAnyChild: false,
    });

    expect(varMap.isVariableDefined("@foo")).toBeTrue();
    expect(varMap.isVariableDefined("@bar")).toBeFalse();

    expect(clone.isVariableDefined("@foo")).toBeTrue();
    expect(clone.isVariableDefined("@bar")).toBeTrue();
  });
});

describe("addSourceMap", () => {
  // Use case: adding an output of previous brick to the current brick's available vars
  test("adds a source map", () => {
    const varMap1 = new VarMap();
    varMap1.setOutputKeyExistence({
      source: "brick1",
      outputKey: "@foo",
      existence: VarExistence.DEFINITELY,
      allowAnyChild: false,
    });

    const varMap2 = new VarMap();
    varMap2.setOutputKeyExistence({
      source: "brick2",
      outputKey: "@bar",
      existence: VarExistence.DEFINITELY,
      allowAnyChild: false,
    });

    varMap1.addSourceMap(varMap2);

    expect(varMap1.isVariableDefined("@foo")).toBeTrue();
    expect(varMap1.isVariableDefined("@bar")).toBeTrue();
  });
});
