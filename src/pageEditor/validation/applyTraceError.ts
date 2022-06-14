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

import { BlockPipeline } from "@/blocks/types";
import { TraceError } from "@/telemetry/trace";
import applyTraceBlockError from "./applyTraceBlockError";
import applyTraceInputError from "./applyTraceInputError";
import { FormikErrorTree } from "@/pageEditor/tabs/editTab/editTabTypes";

function applyTraceErrors(
  pipelineErrors: FormikErrorTree,
  traceErrors: TraceError[],
  pipeline: BlockPipeline
) {
  if (traceErrors.length === 0) {
    return;
  }

  for (const traceError of traceErrors) {
    const { blockInstanceId } = traceError;
    const blockIndex = pipeline.findIndex(
      (block) => block.instanceId === blockInstanceId
    );
    if (blockIndex === -1) {
      return;
    }

    applyTraceInputError(pipelineErrors, traceError, blockIndex);
    applyTraceBlockError(pipelineErrors, traceError, blockIndex);
  }
}

export default applyTraceErrors;
