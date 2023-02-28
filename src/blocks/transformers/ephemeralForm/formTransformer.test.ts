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

import { FormTransformer } from "@/blocks/transformers/ephemeralForm/formTransformer";
import { makeVariableExpression } from "@/runtime/expressionCreators";

const brick = new FormTransformer();

describe("FormTransformer", () => {
  it("returns form schema for output schema", () => {
    const schema = {
      type: "object",
      properties: {
        name: { type: "string" },
      },
    };

    const outputSchema = brick.getOutputSchema({
      id: brick.id,
      config: {
        schema,
      },
    });

    expect(outputSchema).toEqual(schema);
  });

  it("return default schema for top-level variable", () => {
    const outputSchema = brick.getOutputSchema({
      id: brick.id,
      config: {
        schema: makeVariableExpression("@test"),
      },
    });

    expect(outputSchema).toEqual(brick.outputSchema);
  });
});
