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

import ForEach from "@/blocks/transformers/controlFlow/ForEach";
import IfElse from "@/blocks/transformers/controlFlow/IfElse";
import { BlockConfig } from "@/blocks/types";
import { isPipelineExpression } from "@/runtime/mapArgs";
import {
  echoBlock,
  teapotBlock,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import { toExpression } from "@/testUtils/testHelpers";
import { withInstanceIds } from "./withInstanceIds";

describe("withInstanceIds", () => {
  let echoBlockConfig: BlockConfig;
  let teapotBlockConfig: BlockConfig;

  beforeEach(() => {
    echoBlockConfig = {
      id: echoBlock.id,
      config: {
        message: toExpression("nunjucks", "test"),
      },
    };

    teapotBlockConfig = {
      id: teapotBlock.id,
      config: {},
    };
  });

  test("should add instance id to every block in pipeline", () => {
    const pipeline = [echoBlockConfig, teapotBlockConfig];

    const actual = withInstanceIds(pipeline);
    for (const config of actual) {
      expect(config.instanceId).toBeDefined();
    }
  });

  test("should add instance id to For-Each block", () => {
    const pipeline: BlockConfig[] = [
      {
        id: ForEach.BLOCK_ID,
        config: {
          elements: toExpression("var", "@input"),
          body: toExpression("pipeline", [echoBlockConfig, teapotBlockConfig]),
        },
      },
    ];

    const actual = withInstanceIds(pipeline) as any;

    // Checking the loop config
    const loopConfig = actual[0].config.body;
    expect(isPipelineExpression(loopConfig)).toBeTrue();
    for (const config of loopConfig.__value__) {
      expect(config.instanceId).toBeDefined();
    }
  });

  test("should add instance id to If-Else block", () => {
    // IF-ELSE block with 2 branches
    const pipeline: BlockConfig[] = [
      {
        id: IfElse.BLOCK_ID,
        config: {
          condition: true,
          if: toExpression("pipeline", [echoBlockConfig]),
          else: toExpression("pipeline", [teapotBlock]),
        },
      },
    ];

    const actual = withInstanceIds(pipeline) as any;

    // Checking IF branch
    const ifConfig = actual[0].config.if;
    expect(isPipelineExpression(ifConfig)).toBeTrue();
    for (const config of ifConfig.__value__) {
      expect(config.instanceId).toBeDefined();
    }

    // Checking ELSE branch
    const elseConfig = actual[0].config.else;
    expect(isPipelineExpression(elseConfig)).toBeTrue();
    for (const config of elseConfig.__value__) {
      expect(config.instanceId).toBeDefined();
    }
  });
});
