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

import { AnalysisVisitor } from "./baseAnalysisVisitors";
import { AnnotationType } from "@/analysis/analysisTypes";
import { isTraceError, TraceRecord } from "@/telemetry/trace";
import { BlockConfig, BlockPosition } from "@/blocks/types";
import { UUID } from "@/core";
import { groupBy } from "lodash";
import { getErrorMessage } from "@/errors/errorHelpers";
import { isInputValidationError } from "@/blocks/errors";
import { nestedPosition, VisitBlockExtra } from "@/blocks/PipelineVisitor";

const requiredFieldRegex =
  /^Instance does not have required property "(?<property>.+)"\.$/;

const rootPropertyRegex = /^#\/(?<property>.+)$/;

class TraceAnalysis extends AnalysisVisitor {
  get id() {
    return "trace";
  }

  private readonly traceMap = new Map<UUID, TraceRecord[]>();

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

  override visitBlock(
    position: BlockPosition,
    blockConfig: BlockConfig,
    extra: VisitBlockExtra
  ) {
    super.visitBlock(position, blockConfig, extra);

    const records = this.traceMap.get(blockConfig.instanceId);
    // The callback isTraceError is used directly without a proxy here to
    // let TS to properly infer the type of records
    const errorRecord = records?.find(isTraceError);
    if (errorRecord == null) {
      return;
    }

    const { error: traceError } = errorRecord;

    if (isInputValidationError(traceError)) {
      for (const maybeInputError of traceError.errors) {
        const rootProperty = rootPropertyRegex.exec(
          maybeInputError.instanceLocation
        )?.groups.property;
        if (rootProperty) {
          this.annotations.push({
            position: nestedPosition(position, "config", rootProperty),
            message: getErrorMessage(maybeInputError.error),
            analysisId: this.id,
            type: AnnotationType.Error,
            detail: traceError,
          });
          continue;
        }

        const requiredProperty = requiredFieldRegex.exec(maybeInputError.error)
          ?.groups.property;
        if (requiredProperty) {
          const errorMessage =
            "Error from the last run: This field is required.";

          this.annotations.push({
            position: nestedPosition(position, "config", requiredProperty),
            message: errorMessage,
            analysisId: this.id,
            type: AnnotationType.Error,
            detail: traceError,
          });
        }
      }
    } else {
      this.annotations.push({
        position,
        message: getErrorMessage(traceError),
        analysisId: this.id,
        type: AnnotationType.Error,
        detail: traceError,
      });
    }
  }
}

export default TraceAnalysis;
