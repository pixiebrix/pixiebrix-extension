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

import { TraceError } from "@/telemetry/trace";
import applyTraceInputError from "./applyTraceInputError";
import { FormikErrorTree } from "@/pageEditor/tabs/editTab/editTabTypes";
import { PipelineMap } from "@/pageEditor/uiState/uiStateTypes";
import { PIPELINE_BLOCKS_FIELD_NAME } from "@/pageEditor/consts";

function applyTraceErrors(
  pipelineErrors: FormikErrorTree,
  traceErrors: TraceError[],
  pipelineMap: PipelineMap
) {
  if (traceErrors.length === 0) {
    return;
  }

  for (const traceError of traceErrors) {
    const { blockInstanceId } = traceError;
    // eslint-disable-next-line security/detect-object-injection
    const blockInfo = pipelineMap[blockInstanceId];

    if (blockInfo == null) {
      return;
    }

    // Removing the path of the root pipeline (accounting for ".")
    const relativeBlockPath = blockInfo.path.slice(
      PIPELINE_BLOCKS_FIELD_NAME.length + 1
    );

    applyTraceInputError(pipelineErrors, traceError, relativeBlockPath);
  }
}

export default applyTraceErrors;
