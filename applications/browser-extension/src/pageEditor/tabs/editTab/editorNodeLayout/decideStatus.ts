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

import { RunStatus } from "../editTabTypes";
import { type TraceRecord } from "../../../../telemetry/trace";
import { type AnalysisAnnotation } from "../../../../analysis/analysisTypes";
import { AnnotationType } from "../../../../types/annotationTypes";

type DecideBlockStatusArgs = {
  brickAnnotations: AnalysisAnnotation[];
  traceRecord: TraceRecord | undefined;
};

export function decideBrickStatus({
  brickAnnotations,
  traceRecord,
}: DecideBlockStatusArgs): RunStatus {
  if (
    brickAnnotations.some(
      (annotation) => annotation.type === AnnotationType.Error,
    )
  ) {
    return RunStatus.ERROR;
  }

  if (
    brickAnnotations.some(
      (annotation) => annotation.type === AnnotationType.Warning,
    )
  ) {
    return RunStatus.WARNING;
  }

  if (traceRecord == null) {
    return RunStatus.NONE;
  }

  if (traceRecord?.skippedRun) {
    return RunStatus.SKIPPED;
  }

  if (traceRecord.isFinal) {
    return RunStatus.SUCCESS;
  }

  return RunStatus.PENDING;
}

type DecideFoundationStatusArgs = {
  hasTraces: boolean;
  brickAnnotations: AnalysisAnnotation[];
};
export function decideFoundationStatus({
  hasTraces,
  brickAnnotations,
}: DecideFoundationStatusArgs): RunStatus {
  if (
    brickAnnotations.some(
      (annotation) => annotation.type === AnnotationType.Error,
    )
  ) {
    return RunStatus.ERROR;
  }

  if (
    brickAnnotations.some(
      (annotation) => annotation.type === AnnotationType.Warning,
    )
  ) {
    return RunStatus.WARNING;
  }

  // The runtime doesn't directly trace the starter brick. However, if there's a trace from a brick, we
  // know the starter brick ran successfully
  if (hasTraces) {
    return RunStatus.SUCCESS;
  }

  return RunStatus.NONE;
}
