/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { BlockType } from "@/blocks/util";
import { IBlock, OutputKey } from "@/core";
import { blockFactory, pipelineFactory } from "@/tests/factories";
import outputKeyValidator, {
  clearOutputKeyValidatorValidatorCache,
} from "./outputKeyValidator";

describe("outputKeyValidator", () => {
  afterEach(() => {
    clearOutputKeyValidatorValidatorCache();
  });

  test("returns when no blocks given", async () => {
    const pipelineErrors: Record<string, unknown> = {};
    await outputKeyValidator(pipelineErrors, pipelineFactory(), []);

    expect(pipelineErrors).toEqual({});
  });

  test("returns when pipeline is empty", async () => {
    const pipelineErrors: Record<string, unknown> = {};
    await outputKeyValidator(pipelineErrors, [], [{} as IBlock]);

    expect(pipelineErrors).toEqual({});
  });

  test.each([
    ["effect", "effect"],
    ["renderer", "render"],
  ] as Array<[BlockType, string]>)(
    "validates output key is empty for %s",
    async (blockType: BlockType, blockProperty: string) => {
      const pipelineErrors: Record<string, unknown> = {};
      const pipeline = pipelineFactory();
      pipeline[1].outputKey = "not empty" as OutputKey;
      const block = blockFactory({
        [blockProperty]: jest.fn(),
      });
      await outputKeyValidator(pipelineErrors, pipeline, [block]);

      expect(pipelineErrors[0]).toBeUndefined();
      expect((pipelineErrors[1] as any).outputKey).toBe(
        `OutputKey must be empty for ${blockType} block.`
      );
    }
  );

  test.each([
    ["reader", "read"],
    ["transform", "transform"],
  ] as Array<[BlockType, string]>)(
    "validates output key is not empty for %s",
    async (blockType: BlockType, blockProperty: string) => {
      const pipelineErrors: Record<string, unknown> = {};
      const pipeline = pipelineFactory();
      pipeline[0].outputKey = "validOutputKey" as OutputKey;
      const block = blockFactory({
        [blockProperty]: jest.fn(),
      });
      await outputKeyValidator(pipelineErrors, pipeline, [block]);

      expect(pipelineErrors[0]).toBeUndefined();
      expect((pipelineErrors[1] as any).outputKey).toBe(
        "This field is required."
      );
    }
  );

  test.each(["1", "1a", "a1?", "abc?"])(
    'raises error with invalid output key "%s"',
    async (invalidOutputKey: string) => {
      const pipelineErrors: Record<string, unknown> = {};
      const pipeline = pipelineFactory();
      pipeline[0].outputKey = "validOutputKey" as OutputKey;
      pipeline[1].outputKey = invalidOutputKey as OutputKey;
      await outputKeyValidator(pipelineErrors, pipeline, [blockFactory()]);

      expect(pipelineErrors[0]).toBeUndefined();
      expect((pipelineErrors[1] as any).outputKey).toBe(
        "Must start with a letter and only include letters and numbers."
      );
    }
  );

  describe("sequential calls", () => {
    test("validates different pipelines", async () => {
      const allBlocks = [blockFactory()];

      const pipelineErrors1: Record<string, unknown> = {};
      const pipeline1 = pipelineFactory({
        outputKey: "validOutputKey" as OutputKey,
      });
      await outputKeyValidator(pipelineErrors1, pipeline1, allBlocks);
      expect(pipelineErrors1).toEqual({});

      const pipelineErrors2: Record<string, unknown> = {};
      const pipeline2 = pipelineFactory({
        outputKey: "not valid OutputKey" as OutputKey,
      });
      await outputKeyValidator(pipelineErrors2, pipeline2, allBlocks);
      expect(pipelineErrors2[0]).toBeDefined();
      expect(pipelineErrors2[1]).toBeDefined();
    });

    test("validates with different blocks", async () => {
      const pipeline = pipelineFactory();

      const pipelineErrors1: Record<string, unknown> = {};
      const allBlocks1: IBlock[] = [];
      await outputKeyValidator(pipelineErrors1, pipeline, allBlocks1);
      // AllBlocks empty - no validation
      expect(pipelineErrors1).toEqual({});

      const pipelineErrors2: Record<string, unknown> = {};
      const allBlocks2 = [
        blockFactory({
          effect: jest.fn(),
        } as any),
      ];
      await outputKeyValidator(pipelineErrors2, pipeline, allBlocks2);
      // Effects have empty OutputKey
      expect(pipelineErrors1).toEqual({});

      const pipelineErrors3: Record<string, unknown> = {};
      const allBlocks3 = [blockFactory()];
      // Must clear validator's cache when `allBlocks` changes
      clearOutputKeyValidatorValidatorCache();
      await outputKeyValidator(pipelineErrors3, pipeline, allBlocks3);
      // Expect "OutputKey is required" error
      expect(pipelineErrors3[0]).toBeDefined();
      expect(pipelineErrors3[1]).toBeDefined();
    });
  });
});
