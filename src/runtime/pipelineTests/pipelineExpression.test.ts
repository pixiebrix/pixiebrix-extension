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

import blockRegistry from "@/blocks/registry";
import { reducePipeline } from "@/runtime/reducePipeline";
import {
  identityBlock,
  pipelineBlock,
  simpleInput,
  testOptions,
} from "./pipelineTestHelpers";

// Mock the recordX trace methods. Otherwise, they'll fail and Jest will have unhandledrejection errors since we call
// them with `void` instead of awaiting them in the reducePipeline methods
import * as logging from "@/background/messenger/api";

(logging.getLoggingConfig as any) = jest.fn().mockResolvedValue({
  logValues: true,
});

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register(pipelineBlock, identityBlock);
});

describe("apiVersion: v3", () => {
  test("run block with pipeline arg", async () => {
    const pipeline = {
      id: pipelineBlock.id,
      config: {
        pipeline: {
          __type__: "pipeline",
          __value__: [{ id: "@pixiebrix/confetti" }],
        },
      },
    };
    const result = await reducePipeline(
      pipeline,
      simpleInput({}),
      testOptions("v3")
    );
    expect(result).toStrictEqual({ length: 1 });
  });

  test("keep pipeline expression", async () => {
    const pipeline = {
      id: identityBlock.id,
      config: {
        data: {
          __type__: "pipeline",
          __value__: [{ id: "@pixiebrix/confetti" }],
        },
      },
    };
    const result = await reducePipeline(
      pipeline,
      simpleInput({}),
      testOptions("v3")
    );
    expect(result).toStrictEqual({
      data: {
        __type__: "pipeline",
        __value__: [{ id: "@pixiebrix/confetti" }],
      },
    });
  });
});
