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

import { type UUID } from "@/types/stringTypes";
import { type RuntimeState } from "@/pageEditor/slices/runtimeSliceTypes";
import { isTraceError, type TraceRecord } from "@/telemetry/trace";
import { type EditorState } from "@/pageEditor/pageEditorTypes";
import { createSelector } from "@reduxjs/toolkit";
import { getLatestBrickCall } from "@/telemetry/traceHelpers";
import { selectActiveNodeId } from "./editorSelectors";
import { freeze } from "@/utils/objectUtils";

type RootState = { runtime: RuntimeState; editor: EditorState };

type EditorSelector<T> = (state: RootState) => T;

const EMPTY_TRACE = freeze<TraceRecord[]>([]);

export const selectActiveModComponentTraces: EditorSelector<TraceRecord[]> = ({
  runtime,
  editor,
}) =>
  editor.activeModComponentId
    ? runtime.modComponentTraces[editor.activeModComponentId] ?? EMPTY_TRACE
    : EMPTY_TRACE;

const activeModComponentTraceForBrickSelector = createSelector(
  selectActiveModComponentTraces,
  (state: RootState, instanceId: UUID) => instanceId,
  (traces, instanceId) =>
    traces.find((trace) => trace.blockInstanceId === instanceId),
);

export const selectActiveModComponentTraceForBrick =
  (instanceId: UUID) => (state: RootState) =>
    activeModComponentTraceForBrickSelector(state, instanceId);

export const selectActiveNodeTrace = createSelector(
  (state: RootState) => state,
  selectActiveNodeId,
  activeModComponentTraceForBrickSelector,
);

/**
 * Trace records corresponding to errors in the last run. May return multiple for because of sub-pipelines
 */
export const selectTraceErrors = createSelector(
  selectActiveModComponentTraces,
  // eslint-disable-next-line unicorn/no-array-callback-reference -- a proxy function breaks the type inference of isTraceError
  (records) => records.filter(isTraceError),
);

export function makeSelectBrickTrace(
  blockInstanceId: UUID,
): EditorSelector<{ record?: TraceRecord }> {
  return ({ runtime, editor }: RootState) => {
    const records = editor.activeModComponentId
      ? runtime.modComponentTraces[editor.activeModComponentId] ?? []
      : [];

    return {
      record: getLatestBrickCall(records, blockInstanceId),
    };
  };
}
