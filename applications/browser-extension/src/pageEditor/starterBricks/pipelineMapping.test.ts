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

import ForEach from "@/bricks/transformers/controlFlow/ForEach";
import IfElse from "@/bricks/transformers/controlFlow/IfElse";
import TryExcept from "@/bricks/transformers/controlFlow/TryExcept";
import { type BrickConfig } from "@/bricks/types";
import {
  echoBrick,
  teapotBrick,
} from "../../runtime/pipelineTests/testHelpers";
import {
  normalizePipelineForEditor,
  omitEditorMetadata,
} from "./pipelineMapping";
import brickRegistry from "@/bricks/registry";
import { uuidSequence } from "../../testUtils/factories/stringFactories";
import {
  isPipelineExpression,
  toExpression,
} from "../../utils/expressionUtils";
import { type PipelineExpression } from "../../types/runtimeTypes";

describe("normalizePipeline", () => {
  let echoBlockConfig: BrickConfig;
  let teapotBlockConfig: BrickConfig;

  beforeAll(() => {
    brickRegistry.register([
      echoBrick,
      teapotBrick,
      new ForEach(),
      new IfElse(),
      new TryExcept(),
    ]);
  });

  beforeEach(() => {
    echoBlockConfig = {
      id: echoBrick.id,
      config: {
        message: toExpression("nunjucks", "test"),
      },
    };

    teapotBlockConfig = {
      id: teapotBrick.id,
      config: {},
    };
  });

  test("should add instance id to every block in pipeline", async () => {
    const pipeline = [echoBlockConfig, teapotBlockConfig];

    const actual = await normalizePipelineForEditor(pipeline);
    for (const config of actual) {
      expect(config.instanceId).toBeDefined();
    }
  });

  test("For-Each block", async () => {
    const pipeline: BrickConfig[] = [
      {
        id: ForEach.BRICK_ID,
        config: {
          elements: toExpression("var", "@input"),
          body: toExpression("pipeline", [echoBlockConfig, teapotBlockConfig]),
        },
      },
    ];

    const actual = await normalizePipelineForEditor(pipeline);

    // Checking the loop config
    const loopConfig = actual[0]!.config.body;
    expect(isPipelineExpression(loopConfig)).toBeTrue();
    for (const config of (loopConfig as PipelineExpression).__value__) {
      expect(config.instanceId).toBeDefined();
    }
  });

  test("If-Else block", async () => {
    const pipeline: BrickConfig[] = [
      {
        id: IfElse.BRICK_ID,
        config: {
          condition: true,
          if: toExpression("pipeline", [echoBlockConfig]),
          else: toExpression("pipeline", [teapotBlockConfig]),
        },
      },
    ];

    const actual = (await normalizePipelineForEditor(pipeline)) as any;

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

  test("If-Else block with only If branch", async () => {
    const pipeline: BrickConfig[] = [
      {
        id: IfElse.BRICK_ID,
        config: {
          condition: true,
          if: toExpression("pipeline", [echoBlockConfig, teapotBlockConfig]),
        },
      },
    ];

    const actual = await normalizePipelineForEditor(pipeline);

    // Checking IF branch
    const ifConfig = actual[0]!.config.if;
    expect(isPipelineExpression(ifConfig)).toBeTrue();
    const ifConfigPipeline = ifConfig as PipelineExpression;
    for (const config of ifConfigPipeline.__value__) {
      expect(config.instanceId).toBeDefined();
    }

    // ELSE branch should be undefined
    expect(actual[0]!.config.else).toBeUndefined();
  });

  test("Try-Except block", async () => {
    const pipeline: BrickConfig[] = [
      {
        id: TryExcept.BRICK_ID,
        config: {
          try: toExpression("pipeline", [echoBlockConfig]),
          except: toExpression("pipeline", [teapotBlockConfig]),
        },
      },
    ];

    const actual = (await normalizePipelineForEditor(pipeline)) as any;

    // Checking TRY branch
    const tryConfig = actual[0].config.try;
    expect(isPipelineExpression(tryConfig)).toBeTrue();
    for (const config of tryConfig.__value__) {
      expect(config.instanceId).toBeDefined();
    }

    // Checking EXCEPT branch
    const exceptConfig = actual[0].config.except;
    expect(isPipelineExpression(exceptConfig)).toBeTrue();
    for (const config of exceptConfig.__value__) {
      expect(config.instanceId).toBeDefined();
    }
  });

  test("Try-Except block with only Try branch", async () => {
    const pipeline: BrickConfig[] = [
      {
        id: TryExcept.BRICK_ID,
        config: {
          try: toExpression("pipeline", [echoBlockConfig, teapotBlockConfig]),
        },
      },
    ];

    const actual = await normalizePipelineForEditor(pipeline);

    // Checking TRY branch
    const tryConfig = actual[0]!.config.try;
    expect(isPipelineExpression(tryConfig)).toBeTrue();
    const tryConfigPipeline = tryConfig as PipelineExpression;
    for (const config of tryConfigPipeline.__value__) {
      expect(config.instanceId).toBeDefined();
    }

    // EXCEPT branch should be undefined
    expect(actual[0]!.config.except).toBeUndefined();
  });

  test("nested pipelines", async () => {
    const createForEachBlock: (body: BrickConfig[]) => BrickConfig = (
      body,
    ) => ({
      id: ForEach.BRICK_ID,
      config: {
        elements: toExpression("var", "@input"),
        body: toExpression("pipeline", body),
      },
    });

    const pipeline: BrickConfig[] = [
      createForEachBlock([
        createForEachBlock([echoBlockConfig, teapotBlockConfig]),
      ]),
    ];

    const actual = (await normalizePipelineForEditor(pipeline)) as any;

    // 1st level - root
    expect(actual[0].instanceId).toBeDefined();

    // 2nd level
    const loopConfig1: PipelineExpression = actual[0].config.body;
    expect(loopConfig1.__value__[0]!.instanceId).toBeDefined();

    // 3d level
    expect(
      isPipelineExpression(loopConfig1.__value__[0]!.config.body),
    ).toBeTrue();
    const loopConfig2 = loopConfig1.__value__[0]!.config
      .body as PipelineExpression;
    expect(loopConfig2.__value__).toHaveLength(2);
    for (const config of loopConfig2.__value__) {
      expect(config.instanceId).toBeDefined();
    }
  });
});

describe("omitEditorMetadata", () => {
  let echoBlockConfig: BrickConfig;
  let teapotBlockConfig: BrickConfig;

  beforeEach(() => {
    echoBlockConfig = {
      id: echoBrick.id,
      instanceId: uuidSequence(1),
      config: {
        message: toExpression("nunjucks", "test"),
      },
    };

    teapotBlockConfig = {
      id: teapotBrick.id,
      instanceId: uuidSequence(2),
      config: {},
    };
  });

  test("should remove instance id from every block in pipeline", () => {
    const pipeline = [echoBlockConfig, teapotBlockConfig];

    const actual = omitEditorMetadata(pipeline);
    for (const config of actual) {
      expect(config.instanceId).toBeUndefined();
    }
  });

  test("For-Each block", () => {
    const pipeline: BrickConfig[] = [
      {
        id: ForEach.BRICK_ID,
        instanceId: uuidSequence(3),
        config: {
          elements: toExpression("var", "@input"),
          body: toExpression("pipeline", [echoBlockConfig, teapotBlockConfig]),
        },
      },
    ];

    const actual = omitEditorMetadata(pipeline) as any;

    const loopConfig = actual[0].config.body;
    for (const config of loopConfig.__value__) {
      expect(config.instanceId).toBeUndefined();
    }
  });

  test("If-Else block", () => {
    const pipeline: BrickConfig[] = [
      {
        id: IfElse.BRICK_ID,
        instanceId: uuidSequence(3),
        config: {
          condition: true,
          if: toExpression("pipeline", [echoBlockConfig]),
          else: toExpression("pipeline", [teapotBlockConfig]),
        },
      },
    ];

    const actual = omitEditorMetadata(pipeline) as any;

    // Checking IF branch
    const ifConfig = actual[0].config.if;
    for (const config of ifConfig.__value__) {
      expect(config.instanceId).toBeUndefined();
    }

    // Checking ELSE branch
    const elseConfig = actual[0].config.else;
    for (const config of elseConfig.__value__) {
      expect(config.instanceId).toBeUndefined();
    }
  });

  test("Try-Except block", () => {
    const pipeline: BrickConfig[] = [
      {
        id: TryExcept.BRICK_ID,
        instanceId: uuidSequence(3),
        config: {
          try: toExpression("pipeline", [echoBlockConfig]),
          except: toExpression("pipeline", [teapotBlockConfig]),
        },
      },
    ];

    const actual = omitEditorMetadata(pipeline) as any;

    // Checking TRY branch
    const tryConfig = actual[0].config.try;
    for (const config of tryConfig.__value__) {
      expect(config.instanceId).toBeUndefined();
    }

    // Checking EXCEPT branch
    const exceptConfig = actual[0].config.except;
    for (const config of exceptConfig.__value__) {
      expect(config.instanceId).toBeUndefined();
    }
  });

  test("nested pipelines", () => {
    const createForEachBlock: (
      n: number,
      body: BrickConfig[],
    ) => BrickConfig = (n, body) => ({
      id: ForEach.BRICK_ID,
      instanceId: uuidSequence(n),
      config: {
        elements: toExpression("var", "@input"),
        body: toExpression("pipeline", body),
      },
    });

    const pipeline: BrickConfig[] = [
      createForEachBlock(3, [
        createForEachBlock(4, [echoBlockConfig, teapotBlockConfig]),
      ]),
    ];

    const actual = omitEditorMetadata(pipeline) as any;

    // 1st level - root
    expect(actual[0].instanceId).toBeUndefined();

    // 2nd level
    const loopConfig1: PipelineExpression = actual[0].config.body;
    expect(loopConfig1.__value__[0]!.instanceId).toBeUndefined();

    // 3d level
    const loopConfig2 = loopConfig1.__value__[0]!.config
      .body as PipelineExpression;
    expect(loopConfig2.__value__).toHaveLength(2);
    for (const config of loopConfig2.__value__) {
      expect(config.instanceId).toBeUndefined();
    }
  });
});
