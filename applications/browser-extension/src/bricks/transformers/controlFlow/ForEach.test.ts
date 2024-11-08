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

import brickRegistry from "../../registry";
import { echoBrick, simpleInput } from "../../../runtime/pipelineTests/testHelpers";
import { reducePipeline } from "../../../runtime/reducePipeline";
import ForEach from "./ForEach";
import { toExpression } from "../../../utils/expressionUtils";
import { reduceOptionsFactory } from "../../../testUtils/factories/runtimeFactories";

const forEachBlock = new ForEach();

beforeEach(() => {
  brickRegistry.clear();
  brickRegistry.register([echoBrick, forEachBlock]);
});

describe("ForEach", () => {
  test("loop", async () => {
    const pipeline = {
      id: forEachBlock.id,
      config: {
        elements: toExpression("var", "@input.elements"),
        body: toExpression("pipeline", [
          {
            id: echoBrick.id,
            config: {
              message: toExpression("nunjucks", "iteration {{ @element }}"),
            },
          },
        ]),
      },
    };
    const result = await reducePipeline(
      pipeline,
      simpleInput({ elements: [1, 2, 3] }),
      reduceOptionsFactory("v3"),
    );
    expect(result).toStrictEqual({ message: "iteration 3" });
  });
});
