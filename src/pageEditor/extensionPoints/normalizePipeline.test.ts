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
import TryExcept from "@/blocks/transformers/controlFlow/TryExcept";
import { BlockConfig } from "@/blocks/types";
import { isPipelineExpression, PipelineExpression } from "@/runtime/mapArgs";
import {
  echoBlock,
  teapotBlock,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import { uuidSequence } from "@/testUtils/factories";
import { toExpression } from "@/testUtils/testHelpers";
import { normalizePipeline, omitEditorMetadata } from "./normalizePipeline";

const emptyPipeline: PipelineExpression = Object.freeze({
  __type__: "pipeline",
  __value__: [],
});

describe("normalizePipeline", () => {
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

    const actual = normalizePipeline(pipeline);
    for (const config of actual) {
      expect(config.instanceId).toBeDefined();
    }
  });

  test("For-Each block", () => {
    const pipeline: BlockConfig[] = [
      {
        id: ForEach.BLOCK_ID,
        config: {
          elements: toExpression("var", "@input"),
          body: toExpression("pipeline", [echoBlockConfig, teapotBlockConfig]),
        },
      },
    ];

    const actual = normalizePipeline(pipeline) as any;

    // Checking the loop config
    const loopConfig = actual[0].config.body;
    expect(isPipelineExpression(loopConfig)).toBeTrue();
    for (const config of loopConfig.__value__) {
      expect(config.instanceId).toBeDefined();
    }
  });

  test("If-Else block", () => {
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

    const actual = normalizePipeline(pipeline) as any;

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

  test("If-Else block with only If branch", () => {
    const pipeline: BlockConfig[] = [
      {
        id: IfElse.BLOCK_ID,
        config: {
          condition: true,
          if: toExpression("pipeline", [echoBlockConfig, teapotBlock]),
        },
      },
    ];

    const actual = normalizePipeline(pipeline) as any;

    // Checking IF branch
    const ifConfig = actual[0].config.if;
    expect(isPipelineExpression(ifConfig)).toBeTrue();
    for (const config of ifConfig.__value__) {
      expect(config.instanceId).toBeDefined();
    }

    // ELSE branch should be undefined
    const elseConfig = actual[0].config.else;
    expect(isPipelineExpression(elseConfig)).toBeTrue();
    expect(elseConfig).toEqual(emptyPipeline);
  });

  test("Try-Except block", () => {
    const pipeline: BlockConfig[] = [
      {
        id: TryExcept.BLOCK_ID,
        config: {
          try: toExpression("pipeline", [echoBlockConfig]),
          except: toExpression("pipeline", [teapotBlock]),
        },
      },
    ];

    const actual = normalizePipeline(pipeline) as any;

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

  test("Try-Except block with only Try branch", () => {
    const pipeline: BlockConfig[] = [
      {
        id: TryExcept.BLOCK_ID,
        config: {
          try: toExpression("pipeline", [echoBlockConfig, teapotBlock]),
        },
      },
    ];

    const actual = normalizePipeline(pipeline) as any;

    // Checking TRY branch
    const tryConfig = actual[0].config.try;
    expect(isPipelineExpression(tryConfig)).toBeTrue();
    for (const config of tryConfig.__value__) {
      expect(config.instanceId).toBeDefined();
    }

    // EXCEPT branch should be undefined
    const exceptConfig = actual[0].config.except;
    expect(isPipelineExpression(exceptConfig)).toBeTrue();
    expect(exceptConfig).toEqual(emptyPipeline);
  });

  test("nested pipelines", () => {
    const createForEachBlock: (body: BlockConfig[]) => BlockConfig = (
      body
    ) => ({
      id: ForEach.BLOCK_ID,
      config: {
        elements: toExpression("var", "@input"),
        body: toExpression("pipeline", body),
      },
    });

    const pipeline: BlockConfig[] = [
      createForEachBlock([
        createForEachBlock([echoBlockConfig, teapotBlockConfig]),
      ]),
    ];

    const actual = normalizePipeline(pipeline) as any;

    // 1st level - root
    expect(actual[0].instanceId).toBeDefined();

    // 2nd level
    const loopConfig1: PipelineExpression = actual[0].config.body;
    expect(loopConfig1.__value__[0].instanceId).toBeDefined();

    // 3d level
    expect(
      isPipelineExpression(loopConfig1.__value__[0].config.body)
    ).toBeTrue();
    const loopConfig2 = loopConfig1.__value__[0].config
      .body as PipelineExpression;
    expect(loopConfig2.__value__).toHaveLength(2);
    for (const config of loopConfig2.__value__) {
      expect(config.instanceId).toBeDefined();
    }
  });
});

describe("omitEditorMetadata", () => {
  let echoBlockConfig: BlockConfig;
  let teapotBlockConfig: BlockConfig;

  beforeEach(() => {
    echoBlockConfig = {
      id: echoBlock.id,
      instanceId: uuidSequence(1),
      config: {
        message: toExpression("nunjucks", "test"),
      },
    };

    teapotBlockConfig = {
      id: teapotBlock.id,
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
    const pipeline: BlockConfig[] = [
      {
        id: ForEach.BLOCK_ID,
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
    const pipeline: BlockConfig[] = [
      {
        id: IfElse.BLOCK_ID,
        instanceId: uuidSequence(3),
        config: {
          condition: true,
          if: toExpression("pipeline", [echoBlockConfig]),
          else: toExpression("pipeline", [teapotBlock]),
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
    const pipeline: BlockConfig[] = [
      {
        id: TryExcept.BLOCK_ID,
        instanceId: uuidSequence(3),
        config: {
          try: toExpression("pipeline", [echoBlockConfig]),
          except: toExpression("pipeline", [teapotBlock]),
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
      body: BlockConfig[]
    ) => BlockConfig = (n, body) => ({
      id: ForEach.BLOCK_ID,
      instanceId: uuidSequence(n),
      config: {
        elements: toExpression("var", "@input"),
        body: toExpression("pipeline", body),
      },
    });

    const pipeline: BlockConfig[] = [
      createForEachBlock(3, [
        createForEachBlock(4, [echoBlockConfig, teapotBlockConfig]),
      ]),
    ];

    const actual = omitEditorMetadata(pipeline) as any;

    // 1st level - root
    expect(actual[0].instanceId).toBeUndefined();

    // 2nd level
    const loopConfig1: PipelineExpression = actual[0].config.body;
    expect(loopConfig1.__value__[0].instanceId).toBeUndefined();

    // 3d level
    const loopConfig2 = loopConfig1.__value__[0].config
      .body as PipelineExpression;
    expect(loopConfig2.__value__).toHaveLength(2);
    for (const config of loopConfig2.__value__) {
      expect(config.instanceId).toBeUndefined();
    }
  });
});
