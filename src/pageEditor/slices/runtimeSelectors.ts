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

import { UUID } from "@/core";
import { RuntimeState } from "@/pageEditor/slices/runtimeSlice";
import { isTraceError, TraceRecord } from "@/telemetry/trace";
import { EditorState } from "@/pageEditor/pageEditorTypes";
import { createSelector } from "reselect";
import { getLatestCall } from "@/telemetry/traceHelpers";

type RootState = { runtime: RuntimeState; editor: EditorState };

type EditorSelector<T> = (state: RootState) => T;

const EMPTY_TRACE: TraceRecord[] = Object.freeze([]) as TraceRecord[];

export const selectExtensionTrace: EditorSelector<TraceRecord[]> = ({
  runtime,
  editor,
}) => runtime.extensionTraces[editor.activeElementId] ?? EMPTY_TRACE;

/**
 * Trace records corresponding to errors in the last run. May return multiple for because of sub-pipelines
 */
export const selectTraceErrors = createSelector(
  selectExtensionTrace,
  // eslint-disable-next-line unicorn/no-array-callback-reference -- a proxy function breaks the type inference
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
