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

import { type BrickOptions, type RunMetadata } from "@/types/runtimeTypes";
import { define, derive } from "cooky-cutter";
import ConsoleLogger from "@/utils/ConsoleLogger";
import contentScriptPlatform from "@/contentScript/contentScriptPlatform";
import { modComponentRefFactory } from "@/testUtils/factories/modComponentFactories";

/**
 * Factory for BrickOptions to pass to Brick.run method.
 *
 * For creating brick arguments for testing, see unsafeAssumeValidArg.
 *
 * @see unsafeAssumeValidArg
 */
export const brickOptionsFactory = define<BrickOptions>({
  ctxt() {
    return {};
  },
  platform: (_i: number) => contentScriptPlatform,
  logger(_i: number) {
    const { blueprintId, ...rest } = modComponentRefFactory();
    // MessageContext expects undefined instead of null for blueprintId
    return new ConsoleLogger({
      ...rest,
      blueprintId: blueprintId ?? undefined,
    });
  },
  root: (_i: number) => document,
  runPipeline: (_i: number) =>
    jest.fn().mockRejectedValue(new Error("runPipeline mock not implemented")),
  runRendererPipeline: (_i: number) =>
    jest
      .fn()
      .mockRejectedValue(new Error("runRendererPipeline mock not implemented")),
  meta: derive<BrickOptions, RunMetadata>(
    (options) => ({
      runId: null,
      extensionId: options.logger?.context.extensionId,
      branches: [],
    }),
    "logger",
  ),
});
