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
} from "@/analysis/analysisVisitors/varAnalysis/varMap";
import { filterVarMapByVariable } from "@/components/fields/schemaFields/widgets/varPopup/menuFilters";

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
    expect(filterVarMapByVariable(inputMap, "@inpu")).toContainKey("@input");

    // Exact match
    expect(filterVarMapByVariable(inputMap, "@input")).toContainKey("@input");

    // Empty because trailing period indicates final variable name
    expect(filterVarMapByVariable(inputMap, "@inpu.")).not.toContainKey(
      "@input"
    );

    expect(filterVarMapByVariable(inputMap, "@input2")).not.toContainKey(
      "@input"
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
    expect(filterVarMapByVariable(inputMap, "@input.f")).toEqual(
      expect.objectContaining({
        "@input": expect.objectContaining({
          foo: expect.toBeObject(),
        }),
      })
    );

    // Exact match
    expect(filterVarMapByVariable(inputMap, "@input.foo")).toEqual(
      expect.objectContaining({
        "@input": expect.objectContaining({
          foo: expect.toBeObject(),
        }),
      })
    );

    // Empty because trailing period indicates final variable name
    expect(filterVarMapByVariable(inputMap, "@input.fo.")).toEqual(
      expect.objectContaining({
        "@input": expect.not.toContainKey("foo"),
      })
    );

    // Empty due to extra characters
    expect(filterVarMapByVariable(inputMap, "@input.food")).toEqual(
      expect.objectContaining({
        "@input": expect.not.toContainKey("foo"),
      })
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

    expect(filterVarMapByVariable(inputMap, "@input.items[0].f")).toEqual(
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
      })
    );

    // Array is known to only have 2 elements
    expect(filterVarMapByVariable(inputMap, "@input.items[3]")).toEqual(
      expect.objectContaining({
        "@input": expect.objectContaining({
          items: expect.objectContaining({
            [IS_ARRAY]: true,
            [SELF_EXISTENCE]: VarExistence.DEFINITELY,
            [ALLOW_ANY_CHILD]: false,
          }),
        }),
      })
    );
  });
});
