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

import AnalysisVisitor from "@/analysis/AnalysisVisitor";
import {
  AbsolutePosition,
  Analysis,
  Annotation,
} from "@/analysis/analysisTypes";
import { TraceError, TraceRecord } from "@/telemetry/trace";
import { BlockConfig } from "@/blocks/types";
import { UUID } from "@/core";
import { groupBy } from "lodash";
import { getErrorMessage } from "@/errors/errorHelpers";
import { isInputValidationError } from "@/blocks/errors";

export class TraceAnalysis extends AnalysisVisitor implements Analysis {
  readonly id: "trace";

  private readonly traceMap = new Map<UUID, TraceRecord[]>();
  private readonly annotations: Annotation[] = [];

  /**
   * @param trace the trace for the latest run of the extension
   */
  constructor(trace: TraceRecord[]) {
    super();

    for (const [instanceId, records] of Object.entries(
      groupBy(trace, (x) => x.blockInstanceId)
    )) {
      this.traceMap.set(instanceId as UUID, records);
    }
  }

  getAnnotations(): Annotation[] {
    return this.annotations;
  }

  override async visitBlock(
    position: AbsolutePosition,
    blockConfig: BlockConfig
  ): Promise<void> {
    const records = this.traceMap.get(blockConfig.instanceId);
    // TODO: fix if we need to get the last record for the block
    const errorRecord: TraceError = records.find(
      (x) => "error" in x
    ) as TraceError;

    if (isInputValidationError(errorRecord)) {
      // TODO: add logic from applyTraceInputError
      // https://github.com/pixiebrix/pixiebrix-extension/blob/1aa42d7ef1f6652e3a3340e0138122d6ceb29378/src/pageEditor/validation/applyTraceInputError.ts#L35-L35
    } else if (errorRecord) {
      this.annotations.push({
        position,
        message: getErrorMessage(errorRecord.error.message),
        analysisId: this.id,
        type: "error",
        detail: errorRecord.error,
      });
    }
  }
}
