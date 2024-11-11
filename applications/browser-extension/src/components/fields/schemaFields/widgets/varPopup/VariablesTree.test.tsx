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

import React from "react";
import testItRenders from "@/testUtils/testItRenders";
import { noop } from "lodash";
import VariablesTree from "./VariablesTree";
import VarMap, {
  ALLOW_ANY_CHILD,
} from "@/analysis/analysisVisitors/varAnalysis/varMap";
import { render, screen } from "@testing-library/react";
import { type UnknownRecord } from "type-fest";

testItRenders({
  testName: "Renders the tree",
  Component: VariablesTree,
  props: {
    vars: {
      "@input": {
        type: "not set",
        description: "not set",
        props: {
          markdown: {},
        },
        url: "not set",
        icon: {},
      },
    } as any,
    onVarSelect: noop,
    likelyVariable: null,
    activeKeyPath: null,
  },
});

describe("VariablesTree", () => {
  it("sorts nested variables", () => {
    const varMap = new VarMap();
    varMap.setExistenceFromValues({
      source: "input",
      values: {
        "@input": {
          foo: {
            zulu: 42,
            hotel: 42,
            alpha: 42,
          },
        },
      },
    });

    const { input: inputMap } = varMap.getMap();

    (inputMap as any)["@input"].foo[ALLOW_ANY_CHILD] = true;

    render(
      <VariablesTree
        vars={inputMap as UnknownRecord}
        onVarSelect={noop}
        likelyVariable="@input.foo."
        activeKeyPath={null}
      />,
    );

    const elements = screen.getAllByRole("button");
    expect(elements[0]).toHaveTextContent("@input");
    expect(elements[1]).toHaveTextContent("foo");
    expect(elements[2]).toHaveTextContent("alpha");
    expect(elements[3]).toHaveTextContent("hotel");
    expect(elements[4]).toHaveTextContent("zulu");
  });
});
