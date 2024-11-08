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

import VarAnalysis, {
  KnownSources,
} from "@/analysis/analysisVisitors/varAnalysis/varAnalysis";
import VarMap, {
  ALLOW_ANY_CHILD,
  IS_ARRAY,
  SELF_EXISTENCE,
  VarExistence,
} from "@/analysis/analysisVisitors/varAnalysis/varMap";
import getMenuOptions from "./getMenuOptions";
import { type JsonObject } from "type-fest";
import {
  draftModStateFactory,
  formStateFactory,
} from "../../../../../testUtils/factories/pageEditorFactories";
import { brickConfigFactory } from "../../../../../testUtils/factories/brickFactories";
import registerBuiltinBricks from "@/bricks/registerBuiltinBricks";

beforeAll(() => {
  registerBuiltinBricks();
});

describe("setting values", () => {
  let knownVars: VarMap;
  let trace: Record<string, JsonObject>;
  beforeEach(() => {
    knownVars = new VarMap();
    knownVars.setExistenceFromValues({
      source: "input:Array Composite Reader",
      values: {
        description: "foo",
        icon: "bar",
        image: "baz",
      },
      parentPath: "@input",
    });

    knownVars.setVariableExistence({
      source: "modComponent.brickPipeline.0",
      variableName: "@jq",
      existence: VarExistence.DEFINITELY,
      allowAnyChild: true,
    });

    trace = {
      "@input": {
        icon: "https://pbx.vercel.app/bootstrap-5/favicon.ico",
        title: "PixieBrix Testing Page",
      },
      "@jq": {
        foo: "bar",
      },
    };
  });

  test("returns options in correct order when no trace is available", () => {
    const actual = getMenuOptions(knownVars!, {});

    // Validate the order of the options
    expect(actual.map(([key]) => key)).toEqual([
      "input:Array Composite Reader",
      "modComponent.brickPipeline.0",
    ]);
  });

  test("removes the trace source from VarMap", () => {
    knownVars.setExistenceFromValues({
      source: KnownSources.TRACE,
      values: trace,
    });

    const actual = getMenuOptions(knownVars!, {});

    expect(actual.map(([key]) => key)).not.toContain(KnownSources.TRACE);
  });

  test("returns options in correct order when trace is available", () => {
    const actual = getMenuOptions(knownVars!, trace);

    // Validate the order of the options
    expect(actual.map(([key]) => key)).toEqual([
      "input:Array Composite Reader",
      "modComponent.brickPipeline.0",
    ]);

    // Function getMenuOptions produces a mix of VarMap nodes and plain values from the trace
    // In the objects below you can disregard the VarMap properties (SELF_EXISTENCE and ALLOW_ANY_CHILD)
    const readerNode = {
      [SELF_EXISTENCE]: VarExistence.DEFINITELY,
      [ALLOW_ANY_CHILD]: false,
      [IS_ARRAY]: false,

      "@input": {
        [SELF_EXISTENCE]: VarExistence.DEFINITELY,
        [ALLOW_ANY_CHILD]: false,
        [IS_ARRAY]: false,

        description: {
          [SELF_EXISTENCE]: VarExistence.DEFINITELY,
          [ALLOW_ANY_CHILD]: false,
          [IS_ARRAY]: false,
        },
        icon: "https://pbx.vercel.app/bootstrap-5/favicon.ico",
        image: {
          [SELF_EXISTENCE]: VarExistence.DEFINITELY,
          [ALLOW_ANY_CHILD]: false,
          [IS_ARRAY]: false,
        },
        title: "PixieBrix Testing Page",
      },
    };
    expect(actual[0]![1]).toEqual(readerNode);

    const jqNode = {
      "@jq": {
        [SELF_EXISTENCE]: VarExistence.DEFINITELY,
        [ALLOW_ANY_CHILD]: true,
        [IS_ARRAY]: false,

        foo: "bar",
      },
    };
    expect(actual[1]![1]).toEqual(jqNode);
  });
});

describe("arrays", () => {
  const source = "test";
  test("inserts index for array item", () => {
    const varMap = new VarMap();
    varMap.setExistence({
      source,
      path: "@input.items",
      existence: VarExistence.DEFINITELY,
      isArray: true,
    });

    const actual = getMenuOptions(varMap, {});

    expect(actual).toEqual([
      [
        source,
        {
          [SELF_EXISTENCE]: VarExistence.DEFINITELY,
          [ALLOW_ANY_CHILD]: false,
          [IS_ARRAY]: false,
          "@input": {
            [SELF_EXISTENCE]: VarExistence.DEFINITELY,
            [ALLOW_ANY_CHILD]: false,
            [IS_ARRAY]: false,
            items: [
              {
                [SELF_EXISTENCE]: VarExistence.DEFINITELY,
                [ALLOW_ANY_CHILD]: false,
                [IS_ARRAY]: true,
              },
            ],
          },
        },
      ],
    ]);
  });
});

describe("mod variables", () => {
  it("includes mod variables entry", async () => {
    const analysis = new VarAnalysis({ modState: { foo: 42 } });
    const formState = formStateFactory({
      brickPipeline: [brickConfigFactory()],
    });
    await analysis.run(formState, draftModStateFactory());

    const knownVars = analysis
      .getKnownVars()
      .get("modComponent.brickPipeline.0");

    const actual = getMenuOptions(knownVars!, {});
    expect(actual).toEqual([
      ["mod", expect.toBeObject()],
      ["input", expect.toBeObject()],
    ]);
  });
});
