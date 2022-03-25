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
import { TraceError, TraceRecord } from "@/telemetry/trace";
import { EditorState } from "@/pageEditor/pageEditorTypes";

type RootState = { runtime: RuntimeState; editor: EditorState };

type EditorSelector<T> = (state: RootState) => T;

/**
 * The trace record corresponding to an error in the latest run, or null if there is no trace or the previous
 * run executed successfully
 */
export const selectTraceError: EditorSelector<TraceError> = (state) => {
  const records = selectExtensionTrace(state);
  return records.find((x) => "error" in x && x.error) as TraceError;
};

const EMPTY_TRACE: TraceRecord[] = Object.freeze([]) as TraceRecord[];

export const selectExtensionTrace: EditorSelector<TraceRecord[]> = ({
  runtime,
  editor,
}) => runtime.extensionTraces[editor.activeElement] ?? EMPTY_TRACE;

export function makeSelectBlockTrace(
  blockInstanceId: UUID
): EditorSelector<{ record: TraceRecord }> {
  return ({ runtime, editor }: RootState) => ({
    record: runtime.extensionTraces[editor.activeElement]?.find(
      (x) => x.blockInstanceId === blockInstanceId
    ),
  });
}
