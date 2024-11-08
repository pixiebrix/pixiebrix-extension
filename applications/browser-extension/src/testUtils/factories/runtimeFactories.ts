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

import {
  type ApiVersion,
  type BrickOptions,
  type RunMetadata,
} from "../../types/runtimeTypes";
import { define, derive } from "cooky-cutter";
import ConsoleLogger from "../../utils/ConsoleLogger";
import contentScriptPlatform from "../../contentScript/contentScriptPlatform";
import { modComponentRefFactory } from "./modComponentFactories";
import { mapModComponentRefToMessageContext } from "../../utils/modUtils";
import type { ReduceOptions } from "../../runtime/reducePipeline";
import apiVersionOptions from "../../runtime/apiVersionOptions";
import { assertNotNullish } from "../../utils/nullishUtils";

export const runMetadataFactory = define<RunMetadata>({
  runId: null,
  modComponentRef: modComponentRefFactory,
  branches: () => [] as RunMetadata["branches"],
});

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
  platform: () => contentScriptPlatform,
  meta: runMetadataFactory,
  logger: derive<BrickOptions, BrickOptions["logger"]>((options) => {
    assertNotNullish(
      options.meta,
      "You must provide BrickOptions.meta to derive logger",
    );
    return new ConsoleLogger(
      mapModComponentRefToMessageContext(options.meta.modComponentRef),
    );
  }, "meta"),
  root: () => document,
  runPipeline: () =>
    jest.fn().mockRejectedValue(new Error("runPipeline mock not implemented")),
  runRendererPipeline: () =>
    jest
      .fn()
      .mockRejectedValue(new Error("runRendererPipeline mock not implemented")),
});

/**
 * ReduceOptions factory for passing to runtime reducer methods
 * @see ReduceOptions
 * @see apiVersionOptions
 */
export function reduceOptionsFactory(
  // XXX: How to handle traits in cooky-cutter similar to Python's Factory Boy?
  // https://factoryboy.readthedocs.io/en/stable/introduction.html#altering-a-factory-s-behavior-parameters-and-traits
  runtimeVersion: ApiVersion = "v3",
  overrides: Partial<ReduceOptions> = {},
): ReduceOptions {
  const modComponentRef = overrides.modComponentRef ?? modComponentRefFactory();
  const logger =
    overrides.logger ??
    new ConsoleLogger(mapModComponentRefToMessageContext(modComponentRef));

  return {
    modComponentRef,
    logger,
    runId: overrides.runId ?? null,
    headless: overrides.headless ?? false,
    branches: overrides.branches ?? [],
    logValues: overrides.logValues ?? true,
    ...apiVersionOptions(runtimeVersion),
  };
}
