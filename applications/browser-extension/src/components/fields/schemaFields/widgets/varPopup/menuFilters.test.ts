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

import VarMap, {
  ALLOW_ANY_CHILD,
  IS_ARRAY,
  SELF_EXISTENCE,
  VarExistence,
} from "@/analysis/analysisVisitors/varAnalysis/varMap";
import {
  defaultMenuOption,
  expandCurrentVariableLevel,
  filterOptionsByVariable,
  filterVarMapByVariable,
  moveMenuOption,
} from "./menuFilters";
import getMenuOptions from "./getMenuOptions";

describe("filterVarMapByVariable", () => {
  it("filters top-level", () => {
    const varMap = new VarMap();
    varMap.setExistenceFromValues({
      source: "input",
      values: {
        "@input": {
          foo: 42,
        },
      },
    });

    const { input: inputMap } = varMap.getMap();

    // Prefix match for possibly unfinished variable name
    expect(filterVarMapByVariable(inputMap!, "@inpu")).toContainKey("@input");

    // Exact match
    expect(filterVarMapByVariable(inputMap!, "@input")).toContainKey("@input");

    // Empty because trailing period indicates final variable name
    expect(filterVarMapByVariable(inputMap!, "@inpu.")).not.toContainKey(
      "@input",
    );

    expect(filterVarMapByVariable(inputMap!, "@input2")).not.toContainKey(
      "@input",
    );
  });

  it("filters nested variable names", () => {
    const varMap = new VarMap();
    varMap.setExistenceFromValues({
      source: "input",
      values: {
        "@input": {
          foo: 42,
        },
      },
    });

    const { input: inputMap } = varMap.getMap();

    // Prefix match for possibly unfinished variable name
    expect(filterVarMapByVariable(inputMap!, "@input.f")).toEqual(
      expect.objectContaining({
        "@input": expect.objectContaining({
          foo: expect.toBeObject(),
        }),
      }),
    );

    // Exact match
    expect(filterVarMapByVariable(inputMap!, "@input.foo")).toEqual(
      expect.objectContaining({
        "@input": expect.objectContaining({
          foo: expect.toBeObject(),
        }),
      }),
    );

    // Exact match with chaining
    expect(filterVarMapByVariable(inputMap!, "@input?.foo")).toEqual(
      expect.objectContaining({
        "@input": expect.objectContaining({
          foo: expect.toBeObject(),
        }),
      }),
    );

    // Empty because trailing period indicates final variable name
    expect(filterVarMapByVariable(inputMap!, "@input.fo.")).toEqual(
      expect.objectContaining({
        "@input": expect.not.toContainKey("foo"),
      }),
    );

    // Empty due to extra characters
    expect(filterVarMapByVariable(inputMap!, "@input.food")).toEqual(
      expect.objectContaining({
        "@input": expect.not.toContainKey("foo"),
      }),
    );
  });

  it("handles array values from array literal", () => {
    const varMap = new VarMap();
    varMap.setExistenceFromValues({
      source: "input",
      values: {
        "@input": {
          items: [{ foo: 42 }, { bar: 42 }],
        },
      },
    });

    const { input: inputMap } = varMap.getMap();

    expect(filterVarMapByVariable(inputMap!, "@input.items[0].f")).toEqual(
      expect.objectContaining({
        "@input": expect.objectContaining({
          // Assert exactly to assert only 0 is present
          items: {
            0: expect.toBeObject(),
            [IS_ARRAY]: true,
            [SELF_EXISTENCE]: VarExistence.DEFINITELY,
            [ALLOW_ANY_CHILD]: false,
          },
        }),
      }),
    );

    // Array is known to only have 2 elements
    expect(filterVarMapByVariable(inputMap!, "@input.items[3]")).toEqual(
      expect.objectContaining({
        "@input": expect.objectContaining({
          items: expect.objectContaining({
            [IS_ARRAY]: true,
            [SELF_EXISTENCE]: VarExistence.DEFINITELY,
            [ALLOW_ANY_CHILD]: false,
          }),
        }),
      }),
    );
  });
});

describe("expandCurrentVariableLevel", () => {
  test("don't expand if just '@'", () => {
    const varMap = new VarMap();
    varMap.setExistenceFromValues({
      source: "input",
      values: {
        "@input": {
          foo: 42,
        },
      },
    });

    const { input: inputMap } = varMap.getMap();

    const shouldExpand = expandCurrentVariableLevel(inputMap!, "@");
    expect(shouldExpand(["@input"], null, 0)).toBe(false);
    expect(shouldExpand(["@input"], null, 1)).toBe(false);
  });

  test("don't expand if prefix doesn't match", () => {
    const varMap = new VarMap();
    varMap.setExistenceFromValues({
      source: "input",
      values: {
        "@input": {
          foo: 42,
        },
      },
    });

    const { input: inputMap } = varMap.getMap();

    const shouldExpand = expandCurrentVariableLevel(inputMap!, "@foo");
    expect(shouldExpand(["@input"], null, 0)).toBe(true);
    // JSONTree builds keypath in reverse order
    expect(shouldExpand(["foo", "@input"], null, 1)).toBe(false);
  });

  test("should not expand if no trailing dot", () => {
    const varMap = new VarMap();
    varMap.setExistenceFromValues({
      source: "input",
      values: {
        "@input": {
          foo: 42,
        },
      },
    });

    const { input: inputMap } = varMap.getMap();

    const shouldExpand = expandCurrentVariableLevel(inputMap!, "@input");
    expect(shouldExpand(["@input"], null, 0)).toBe(true);
    expect(shouldExpand(["foo", "@input"], null, 1)).toBe(false);
  });

  test("should expand if trailing dot", () => {
    const varMap = new VarMap();
    varMap.setExistenceFromValues({
      source: "input",
      values: {
        "@input": {
          foo: 42,
        },
      },
    });

    const { input: inputMap } = varMap.getMap();

    const shouldExpand = expandCurrentVariableLevel(inputMap!, "@input.");
    expect(shouldExpand(["@input"], null, 0)).toBe(true);
    expect(shouldExpand(["foo", "@input"], null, 1)).toBe(true);
  });

  test("should expand nested if trailing dot", () => {
    const varMap = new VarMap();
    varMap.setExistenceFromValues({
      source: "input",
      values: {
        "@input": {
          foo: {
            bar: 42,
          },
        },
      },
    });

    const { input: inputMap } = varMap.getMap();

    const shouldExpand = expandCurrentVariableLevel(inputMap!, "@input.foo.");
    expect(shouldExpand(["@input"], null, 0)).toBe(true);
    expect(shouldExpand(["foo", "@input"], null, 1)).toBe(true);
    expect(shouldExpand(["bar", "foo", "@input"], null, 2)).toBe(true);
  });
});

describe("defaultMenuOption", () => {
  it("handles empty var map", () => {
    const options = getMenuOptions(new VarMap(), {});
    const filteredOptions = filterOptionsByVariable(options, "@input.foo");
    expect(defaultMenuOption(filteredOptions, "@input.foo")).toBeNull();
  });

  it("defaults to exact nested variable", () => {
    const varMap = new VarMap();
    varMap.setExistenceFromValues({
      source: "input",
      values: {
        "@input": {
          foo: {
            bar: 42,
          },
        },
      },
    });

    const options = getMenuOptions(varMap, {});
    const filteredOptions = filterOptionsByVariable(options, "@input.foo");

    expect(defaultMenuOption(filteredOptions, "@input.foo")).toEqual([
      "foo",
      "@input",
    ]);
  });

  it("defaults to first partial match", () => {
    const varMap = new VarMap();
    varMap.setExistenceFromValues({
      source: "input",
      values: {
        "@input": {
          foo: "42",
          foz: "42",
        },
      },
    });

    const options = getMenuOptions(varMap, {});
    const filteredOptions = filterOptionsByVariable(options, "@input.f");

    expect(defaultMenuOption(filteredOptions, "@input.f")).toEqual([
      "foo",
      "@input",
    ]);
  });

  test("skips the partial check for a trailing dot", () => {
    const varMap = new VarMap();
    varMap.setExistenceFromValues({
      source: "input",
      values: {
        "@input": {
          foo: "42",
          foz: "42",
        },
      },
    });

    const options = getMenuOptions(varMap, {});
    const filteredOptions = filterOptionsByVariable(options, "@input.foo.");

    expect(defaultMenuOption(filteredOptions, "@input.foo.")).toEqual([
      "foo",
      "@input",
    ]);
  });

  it("default for '@'", () => {
    const varMap = new VarMap();
    varMap.setExistenceFromValues({
      source: "input",
      values: {
        "@input": {
          foo: {
            bar: 42,
          },
        },
      },
    });

    const options = getMenuOptions(varMap, {});
    const filteredOptions = filterOptionsByVariable(options, "@");

    expect(defaultMenuOption(filteredOptions, "@")).toEqual(["@input"]);
  });

  it("default to last source", () => {
    const varMap = new VarMap();
    varMap.setExistenceFromValues({
      source: "input",
      values: {
        "@input": {
          foo: "42",
        },
      },
    });

    varMap.setExistenceFromValues({
      source: "other",
      values: {
        "@india": {
          foo: "42",
        },
      },
    });

    const options = getMenuOptions(varMap, {});
    const filteredOptions = filterOptionsByVariable(options, "@in");

    expect(defaultMenuOption(filteredOptions, "@in")).toEqual(["@india"]);
  });
});

describe("moveMenuOption", () => {
  it("moves to next matching nested option", () => {
    const varMap = new VarMap();
    varMap.setExistenceFromValues({
      source: "input",
      values: {
        "@input": {
          foo: "42",
          foz: "42",
        },
      },
    });

    const options = getMenuOptions(varMap, {});
    const filteredOptions = filterOptionsByVariable(options, "@input.f");

    expect(
      moveMenuOption({
        options: filteredOptions,
        likelyVariable: "@input.f",
        keyPath: ["foo", "@input"],
        offset: 1,
      }),
    ).toEqual(["foz", "@input"]);
  });

  it("wraps around forward within nested vars", () => {
    const varMap = new VarMap();
    varMap.setExistenceFromValues({
      source: "input",
      values: {
        "@input": {
          foo: "42",
          foz: "42",
        },
      },
    });

    const options = getMenuOptions(varMap, {});
    const filteredOptions = filterOptionsByVariable(options, "@input.f");

    expect(
      moveMenuOption({
        options: filteredOptions,
        likelyVariable: "@input.f",
        keyPath: ["foz", "@input"],
        offset: 1,
      }),
    ).toEqual(["foo", "@input"]);
  });

  it("wraps backward within nested var", () => {
    const varMap = new VarMap();
    varMap.setExistenceFromValues({
      source: "input",
      values: {
        "@input": {
          foo: "42",
          foz: "42",
        },
      },
    });

    const options = getMenuOptions(varMap, {});
    const filteredOptions = filterOptionsByVariable(options, "@input.f");

    expect(
      moveMenuOption({
        options: filteredOptions,
        likelyVariable: "@input.f",
        keyPath: ["foo", "@input"],
        offset: -1,
      }),
    ).toEqual(["foz", "@input"]);
  });

  it("moves to previous nested option", () => {
    const varMap = new VarMap();
    varMap.setExistenceFromValues({
      source: "input",
      values: {
        "@input": {
          foo: "42",
          foz: "42",
        },
      },
    });

    const options = getMenuOptions(varMap, {});
    const filteredOptions = filterOptionsByVariable(options, "@input.f");

    expect(
      moveMenuOption({
        options: filteredOptions,
        likelyVariable: "@input.f",
        keyPath: ["foz", "@input"],
        offset: -1,
      }),
    ).toEqual(["foo", "@input"]);
  });
});
