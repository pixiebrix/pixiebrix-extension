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
  brickReducer,
  type IntermediateState,
  type ReduceOptions,
} from "@/runtime/reducePipeline";
import { cloneDeep } from "lodash";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { type SerializableResponse } from "@/types/messengerTypes";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import extendModVariableContext from "@/runtime/extendModVariableContext";
import { $safeFind } from "@/utils/domUtils";
import { BusinessError } from "@/errors/businessErrors";
import { type RunBrickArgs } from "@/contentScript/pageEditor/types";
import { type ModComponentRef } from "@/types/modComponentTypes";

/**
 * Run a single brick (e.g., for generating output previews)
 * @see BrickPreview
 */
export async function runBrickPreview({
  brickConfig,
  context,
  apiVersion,
  modComponentRef,
  rootSelector,
}: RunBrickArgs & {
  modComponentRef: ModComponentRef;
}): Promise<unknown> {
  const versionOptions = apiVersionOptions(apiVersion);

  if (!versionOptions.explicitDataFlow) {
    throw new BusinessError(
      "Preview only supported for mods using runtime v2 or later",
    );
  }

  const state: IntermediateState = {
    context: await extendModVariableContext(context, {
      modComponentRef,
      update: true,
      options: versionOptions,
    }),
    // Can pick any index. It's only used for adding context to log messages, and we're disabling value logging
    // below with `logValues: false`
    index: 0,
    // Force isLastBlock so blockReducer does not complain about the outputKey being forced to undefined
    isLastBrick: true,
    // `root` is over-ridden below if rootSelector is provided
    root: document,
    // We're forcing apiVersion: 2 or higher above values must come from the context
    previousOutput: {},
  };

  if (rootSelector) {
    // Handle non-document contexts. If the selector is unique, this gives the root that would be available at runtime.
    // Differences in behavior:
    // - For triggers, the PixieBrix looks for the closest ancestor to the DOM event target matching the selector
    //   See TriggerStarterBrick.eventHandler for reference
    // - For multi-menus (not currently available in the Page Editor), the below logic returns an arbitrary menu
    const rootElement = $safeFind(rootSelector);
    if (rootElement.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- length check
      state.root = rootElement.get(0)!;
    }
  }

  const options: ReduceOptions = {
    ...versionOptions,
    modComponentRef,
    branches: [],
    headless: true,
    // Exclude logger context to prevent the run from being shown in logs for the mod component/brick
    logger: new ConsoleLogger(),
    logValues: false,
    // Exclude runId to prevent the run from being stored in traces. (Including the run in traces would reset the
    // run shown in the brick actions panel of the Page Editor.)
    runId: null,
  };

  // Exclude the outputKey so that `output` is the output of the brick. Alternatively we could have taken then
  // value from the context[outputKey] from the return value of blockReducer
  const { output } = await brickReducer(
    { ...brickConfig, outputKey: undefined },
    state,
    options,
  );

  return cloneDeep(output) as SerializableResponse;
}
