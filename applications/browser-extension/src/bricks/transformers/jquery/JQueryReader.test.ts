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

import { JQueryReader } from "./JQueryReader";

import { toExpression } from "../../../utils/expressionUtils";

const brick = new JQueryReader();

describe("JQueryReader output schema", () => {
  it("generates output schema for expression", () => {
    const schema = brick.getOutputSchema({
      id: brick.id,
      config: {
        selectors: toExpression("var", "@test"),
      },
    });

    expect(schema).toEqual(brick.outputSchema);
  });

  it("generates simple output schema", () => {
    const schema = brick.getOutputSchema({
      id: brick.id,
      config: {
        selectors: {
          name: "#name",
        },
      },
    });

    expect(schema).toEqual({
      type: "object",
      properties: {
        name: { type: "string" },
      },
    });
  });

  it("handles complex", () => {
    const schema = brick.getOutputSchema({
      id: brick.id,
      config: {
        selectors: {
          name: {
            selector: "#name",
          },
        },
      },
    });

    expect(schema).toEqual({
      type: "object",
      properties: {
        // For now we're punting on complex/nested types since they can't be produced in the Page Editor
        name: {},
      },
    });
  });

  it("handles multi", () => {
    const schema = brick.getOutputSchema({
      id: brick.id,
      config: {
        selectors: {
          names: {
            selector: "#name",
            multi: true,
          },
        },
      },
    });

    expect(schema).toEqual({
      type: "object",
      properties: {
        names: { type: "array", items: {} },
      },
    });
  });
});
