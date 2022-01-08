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
import { OutputKey } from "@/core";
import { blocksMapFactory, pipelineFactory } from "@/tests/factories";
import validateOutputKey from "./validateOutputKey";
import { FormikErrorTree } from "@/devTools/editor/tabs/editTab/editTabTypes";

test("returns when no blocks given", async () => {
  const pipelineErrors: FormikErrorTree = {};
  validateOutputKey(pipelineErrors, pipelineFactory(), new Map());

  expect(pipelineErrors).toEqual({});
});

test("returns when pipeline is empty", async () => {
  const pipelineErrors: FormikErrorTree = {};
  const allBlocks = await blocksMapFactory();
  validateOutputKey(pipelineErrors, [], allBlocks);

  expect(pipelineErrors).toEqual({});
});

test.each([
  ["effect", "effect"],
  ["renderer", "render"],
] as Array<[BlockType, string]>)(
  "validates output key is empty for %s",
  async (blockType: BlockType, blockProperty: string) => {
    const pipelineErrors: FormikErrorTree = {};
    const pipeline = pipelineFactory();
    pipeline[1].outputKey = "not empty" as OutputKey;
    const allBlocks = await blocksMapFactory({
      [blockProperty]: jest.fn(),
    });
    validateOutputKey(pipelineErrors, pipeline, allBlocks);

    expect(pipelineErrors[0]).toBeUndefined();
    expect((pipelineErrors[1] as any).outputKey).toBe(
      `OutputKey must be empty for "${blockType}" block.`
    );
  }
);

test.each([
  ["reader", "read"],
  ["transform", "transform"],
] as Array<[BlockType, string]>)(
  "validates output key is not empty for %s",
  async (blockType: BlockType, blockProperty: string) => {
    const pipelineErrors: FormikErrorTree = {};
    const pipeline = pipelineFactory();
    pipeline[0].outputKey = "validOutputKey" as OutputKey;
    const allBlocks = await blocksMapFactory({
      [blockProperty]: jest.fn(),
    });
    validateOutputKey(pipelineErrors, pipeline, allBlocks);

    expect(pipelineErrors[0]).toBeUndefined();
    expect((pipelineErrors[1] as any).outputKey).toBe(
      "This field is required."
    );
  }
);

test.each(["1", "1a", "a1?", "abc?"])(
  'raises error with invalid output key "%s"',
  async (invalidOutputKey: string) => {
    const pipelineErrors: FormikErrorTree = {};
    const pipeline = pipelineFactory();
    pipeline[0].outputKey = "validOutputKey" as OutputKey;
    pipeline[1].outputKey = invalidOutputKey as OutputKey;
    const allBlocks = await blocksMapFactory();
    validateOutputKey(pipelineErrors, pipeline, allBlocks);

    expect(pipelineErrors[0]).toBeUndefined();
    expect((pipelineErrors[1] as any).outputKey).toBe(
      "Must start with a letter and only include letters and numbers."
    );
  }
);
