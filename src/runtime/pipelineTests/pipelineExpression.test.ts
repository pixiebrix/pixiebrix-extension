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

import brickRegistry from "@/bricks/registry";
import { reducePipeline } from "@/runtime/reducePipeline";
import {
  identityBrick,
  pipelineBrick,
  simpleInput,
} from "./pipelineTestHelpers";
import { toExpression } from "@/utils/expressionUtils";
import { validateRegistryId } from "@/types/helpers";
import { reduceOptionsFactory } from "@/testUtils/factories/runtimeFactories";

beforeEach(() => {
  brickRegistry.clear();
  brickRegistry.register([pipelineBrick, identityBrick]);
});

describe("apiVersion: v3", () => {
  test("run block with pipeline arg", async () => {
    const pipeline = {
      id: pipelineBrick.id,
      config: {
        pipeline: toExpression("pipeline", [
          { id: validateRegistryId("@pixiebrix/confetti"), config: {} },
        ]),
      },
    };
    const result = await reducePipeline(
      pipeline,
      simpleInput({}),
      reduceOptionsFactory("v3"),
    );
    expect(result).toStrictEqual({ length: 1 });
  });

  test("keep pipeline expression", async () => {
    const pipeline = {
      id: identityBrick.id,
      config: {
        data: toExpression("pipeline", [
          { id: validateRegistryId("@pixiebrix/confetti"), config: {} },
        ]),
      },
    };
    const result = await reducePipeline(
      pipeline,
      simpleInput({}),
      reduceOptionsFactory("v3"),
    );
    expect(result).toStrictEqual({
      data: toExpression("pipeline", [
        { id: validateRegistryId("@pixiebrix/confetti"), config: {} },
      ]),
    });
  });
});
