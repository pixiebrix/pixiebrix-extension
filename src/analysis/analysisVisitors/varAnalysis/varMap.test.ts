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

import VarMap, { VarExistence } from "./varMap";

describe("setting output key", () => {
  // Use case: setting the existence for a block's output
  test("sets the existence", () => {
    const varMap = new VarMap();

    varMap.setOutputKeyExistence(
      "brick1",
      "@foo",
      VarExistence.DEFINITELY,
      false
    );
    varMap.setOutputKeyExistence(
      "brick2",
      "@bar",
      VarExistence.DEFINITELY,
      false
    );
    expect(varMap.isVariableDefined("@foo")).toBeTrue();
    expect(varMap.isVariableDefined("@bar")).toBeTrue();
  });

  // No real use case, just a functionality expectations
  test("overwrites any previous for the same source", () => {
    const varMap = new VarMap();
    varMap.setOutputKeyExistence(
      "brick1",
      "@foo",
      VarExistence.DEFINITELY,
      false
    );

    varMap.setOutputKeyExistence(
      "brick1",
      "@bar",
      VarExistence.DEFINITELY,
      false
    );

    expect(varMap.isVariableDefined("@foo")).toBeFalse();
    expect(varMap.isVariableDefined("@bar")).toBeTrue();
  });

  test.each([
    [true, true],
    [false, false],
  ])("works when allow any child = %s", (allowAnyChild, expectedExistence) => {
    const varMap = new VarMap();
    varMap.setOutputKeyExistence(
      "brick1",
      "@foo",
      VarExistence.DEFINITELY,
      allowAnyChild
    );

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
    varMap.setExistenceFromValues("brick1", values);

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
    varMap.setExistenceFromValues("brick1", values);

    expect(varMap.isVariableDefined("foo")).toBeTrue();
    expect(varMap.isVariableDefined("foo.bar")).toBeTrue();
    expect(varMap.isVariableDefined("foo.bar.baz")).toBeFalse();
    expect(varMap.isVariableDefined("qux")).toBeTrue();
    expect(varMap.isVariableDefined("quux")).toBeFalse();
  });

  test("set existence from context obj with parent specified", () => {
    const varMap = new VarMap();
    varMap.setExistenceFromValues(
      "brick1",
      {
        qux: "quux",
      },
      "bar.baz"
    );

    expect(varMap.isVariableDefined("bar.baz.qux")).toBeTrue();
  });
});

describe("cloning", () => {
  test("clones a var map", () => {
    const varMap = new VarMap();
    varMap.setOutputKeyExistence(
      "brick1",
      "@foo",
      VarExistence.DEFINITELY,
      false
    );

    const clone = varMap.clone();
    clone.setOutputKeyExistence(
      "brick2",
      "@bar",
      VarExistence.DEFINITELY,
      false
    );

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
    varMap1.setOutputKeyExistence(
      "brick1",
      "@foo",
      VarExistence.DEFINITELY,
      false
    );

    const varMap2 = new VarMap();
    varMap2.setOutputKeyExistence(
      "brick2",
      "@bar",
      VarExistence.DEFINITELY,
      false
    );

    varMap1.addSourceMap(varMap2);

    expect(varMap1.isVariableDefined("@foo")).toBeTrue();
    expect(varMap1.isVariableDefined("@bar")).toBeTrue();
  });
});
