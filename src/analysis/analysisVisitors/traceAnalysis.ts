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

import AnalysisVisitor, { nestedPosition } from "@/analysis/AnalysisVisitor";
import {
  AbsolutePosition,
  Analysis,
  Annotation,
  AnnotationType,
} from "@/analysis/analysisTypes";
import { isTraceError, TraceRecord } from "@/telemetry/trace";
import { BlockConfig } from "@/blocks/types";
import { UUID } from "@/core";
import { groupBy } from "lodash";
import { getErrorMessage } from "@/errors/errorHelpers";
import { isInputValidationError } from "@/blocks/errors";

const requiredFieldRegex =
  /^Instance does not have required property "(?<property>.+)"\.$/;

const rootPropertyRegex = /^#\/(?<property>.+)$/;

class TraceAnalysis extends AnalysisVisitor implements Analysis {
  get id() {
    return "trace";
  }

  private readonly traceMap = new Map<UUID, TraceRecord[]>();
  private readonly annotations: Annotation[] = [];

  getAnnotations(): Annotation[] {
    return this.annotations;
  }

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

  override async visitBlock(
    position: AbsolutePosition,
    blockConfig: BlockConfig,
    options: { index: number }
  ): Promise<void> {
    await super.visitBlock(position, blockConfig, options);

    const records = this.traceMap.get(blockConfig.instanceId);
    // eslint-disable-next-line unicorn/no-array-callback-reference -- a proxy function breaks the type inference
    const errorRecord = records?.find(isTraceError);
    if (errorRecord == null) {
      return;
    }

    if (isInputValidationError(errorRecord)) {
      for (const maybeInputError of errorRecord.errors) {
        const rootProperty = rootPropertyRegex.exec(
          maybeInputError.instanceLocation
        )?.groups.property;
        if (rootProperty) {
          this.annotations.push({
            position: nestedPosition(position, "config", rootProperty),
            message: getErrorMessage(maybeInputError.error),
            analysisId: this.id,
            type: AnnotationType.Error,
            detail: errorRecord.error,
          });
          continue;
        }

        const requiredProperty = requiredFieldRegex.exec(maybeInputError.error)
          ?.groups.property;
        if (requiredProperty) {
          const errorMessage =
            "Error from the last run: This field is required.";

          this.annotations.push({
            position: nestedPosition(position, "config", rootProperty),
            message: errorMessage,
            analysisId: this.id,
            type: AnnotationType.Error,
            detail: errorRecord.error,
          });
        }
      }
    }

    this.annotations.push({
      position,
      message: getErrorMessage(errorRecord.error),
      analysisId: this.id,
      type: AnnotationType.Error,
      detail: errorRecord.error,
    });
  }
}

export default TraceAnalysis;
