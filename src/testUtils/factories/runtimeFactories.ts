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
} from "@/types/runtimeTypes";
import { define, derive } from "cooky-cutter";
import ConsoleLogger from "@/utils/ConsoleLogger";
import contentScriptPlatform from "@/contentScript/contentScriptPlatform";
import { modComponentRefFactory } from "@/testUtils/factories/modComponentFactories";
import { mapModComponentRefToMessageContext } from "@/utils/modUtils";
import type { ReduceOptions } from "@/runtime/reducePipeline";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import { assertNotNullish } from "@/utils/nullishUtils";
import { type ModComponentRef } from "@/types/modComponentTypes";

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
  runtimeVersion: ApiVersion = "v3",
  {
    modComponentRef: modComponentRefOverride,
  }: { modComponentRef?: ModComponentRef } = {},
): ReduceOptions {
  const modComponentRef = modComponentRefOverride ?? modComponentRefFactory();
  const logger = new ConsoleLogger(
    mapModComponentRefToMessageContext(modComponentRef),
  );

  return {
    modComponentRef,
    logger,
    runId: null,
    headless: false,
    branches: [],
    logValues: true,
    ...apiVersionOptions(runtimeVersion),
  };
}
