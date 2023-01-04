/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { type UUID } from "@/core";
import { type RuntimeState } from "@/pageEditor/slices/runtimeSliceTypes";
import { isTraceError, type TraceRecord } from "@/telemetry/trace";
import { type EditorState } from "@/pageEditor/pageEditorTypes";
import { createSelector } from "reselect";
import { getLatestCall } from "@/telemetry/traceHelpers";

type RootState = { runtime: RuntimeState; editor: EditorState };

type EditorSelector<T> = (state: RootState) => T;

const EMPTY_TRACE: TraceRecord[] = Object.freeze([]) as TraceRecord[];

export const selectActiveElementTraces: EditorSelector<TraceRecord[]> = ({
  runtime,
  editor,
}) => runtime.extensionTraces[editor.activeElementId] ?? EMPTY_TRACE;

const activeElementTraceForBlockSelector = createSelector(
  selectActiveElementTraces,
  (state: RootState, instanceId: UUID) => instanceId,
  (traces, instanceId) =>
    traces.find((trace) => trace.blockInstanceId === instanceId)
);

export const selectActiveElementTraceForBlock =
  (instanceId: UUID) => (state: RootState) =>
    activeElementTraceForBlockSelector(state, instanceId);

/**
 * Trace records corresponding to errors in the last run. May return multiple for because of sub-pipelines
 */
export const selectTraceErrors = createSelector(
  selectActiveElementTraces,
  // eslint-disable-next-line unicorn/no-array-callback-reference -- a proxy function breaks the type inference of isTraceError
  (records) => records.filter(isTraceError)
);

export function makeSelectBlockTrace(
  blockInstanceId: UUID
): EditorSelector<{ record: TraceRecord | null }> {
  return ({ runtime, editor }: RootState) => {
    const callRecords = (
      runtime.extensionTraces[editor.activeElementId] ?? []
    ).filter((x) => x.blockInstanceId === blockInstanceId);

    return {
      record: getLatestCall(callRecords),
    };
  };
}
