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

import {
  getLatestRunByModComponentId,
  type TraceRecord,
} from "../../telemetry/trace";
import useInterval from "../../hooks/useInterval";
import { useDispatch, useSelector } from "react-redux";
import runtimeSlice from "../store/runtime/runtimeSlice";
import { selectActiveModComponentId } from "../store/editor/editorSelectors";
import { selectActiveModComponentTraces } from "../store/runtime/runtimeSelectors";
import { isEqual } from "lodash";
import { useRef } from "react";
import reportError from "../../telemetry/reportError";

const { setModComponentTrace } = runtimeSlice.actions;

const TRACE_RELOAD_MILLIS = 350;

/**
 * Select minimal set of data from trace to determine if two traces include the same data (i.e., they include both they
 * entry and exit data).
 */
function selectTraceMetadata(record: TraceRecord) {
  return {
    runId: record.runId,
    timestamp: record.timestamp,
    isFinal: record.isFinal,
    callId: record.callId,
  };
}

/**
 * Hook that refreshes the trace information in the Redux store
 */
function useModComponentTrace() {
  const dispatch = useDispatch();
  const activeModComponentId = useSelector(selectActiveModComponentId);
  const modComponentTrace = useSelector(selectActiveModComponentTraces);

  const checkingNewEntriesRef = useRef(false);
  const refreshTrace = async () => {
    if (checkingNewEntriesRef.current) {
      return;
    }

    checkingNewEntriesRef.current = true;
    try {
      const lastRun = await getLatestRunByModComponentId(activeModComponentId);
      // Keep the Redux log clean. Don't setModComponentTrace unless we have to
      if (
        activeModComponentId &&
        !isEqual(
          lastRun.map((x) => selectTraceMetadata(x)),
          modComponentTrace.map((x) => selectTraceMetadata(x)),
        )
      ) {
        console.debug(
          "Updating mod component trace in Redux slice: %s",
          activeModComponentId,
        );
        dispatch(
          setModComponentTrace({
            modComponentId: activeModComponentId,
            records: lastRun,
          }),
        );
      }
    } catch (error) {
      reportError(error);
    } finally {
      // Make sure we reset the flag
      checkingNewEntriesRef.current = false;
    }
  };

  useInterval(refreshTrace, TRACE_RELOAD_MILLIS);
}

export default useModComponentTrace;
