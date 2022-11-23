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

import VarMap, { VarExistence } from "./varMap2";

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
    expect(varMap.getExistence("@foo")).toBe(VarExistence.DEFINITELY);
    expect(varMap.getExistence("@bar")).toBe(VarExistence.DEFINITELY);
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

    expect(varMap.getExistence("@foo")).toBeUndefined();
    expect(varMap.getExistence("@bar")).toBe(VarExistence.DEFINITELY);
  });

  test.each([
    [true, VarExistence.MAYBE],
    [false, undefined],
  ])("works when allow any child = %s", (allowAnyChild, expectedExistence) => {
    const varMap = new VarMap();
    varMap.setOutputKeyExistence(
      "brick1",
      "@foo",
      VarExistence.DEFINITELY,
      allowAnyChild
    );

    expect(varMap.getExistence("@foo.bar")).toBe(expectedExistence);
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

    expect(varMap.getExistence("@foo")).toBe(VarExistence.DEFINITELY);
    expect(varMap.getExistence("@foo.bar")).toBeUndefined();
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

    expect(varMap.getExistence("foo")).toBe(VarExistence.DEFINITELY);
    expect(varMap.getExistence("foo.bar")).toBe(VarExistence.DEFINITELY);
    expect(varMap.getExistence("foo.bar.baz")).toBeUndefined();
    expect(varMap.getExistence("qux")).toBe(VarExistence.DEFINITELY);
    expect(varMap.getExistence("quux")).toBeUndefined();
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

    expect(varMap.getExistence("bar.baz.qux")).toBe(VarExistence.DEFINITELY);
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

    expect(varMap.getExistence("@foo")).toBe(VarExistence.DEFINITELY);
    expect(varMap.getExistence("@bar")).toBeUndefined();

    expect(clone.getExistence("@foo")).toBe(VarExistence.DEFINITELY);
    expect(clone.getExistence("@bar")).toBe(VarExistence.DEFINITELY);
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

    expect(varMap1.getExistence("@foo")).toBe(VarExistence.DEFINITELY);
    expect(varMap1.getExistence("@bar")).toBe(VarExistence.DEFINITELY);
  });
});
