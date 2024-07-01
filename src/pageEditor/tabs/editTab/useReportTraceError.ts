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

import { selectTraceErrors } from "@/pageEditor/slices/runtimeSelectors";
import { selectSessionId } from "@/pageEditor/slices/sessionSelectors";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { useSelector } from "react-redux";
import { usePreviousValue } from "@/hooks/usePreviousValue";

/**
 * React Hook that reports when there's an error in a trace. Reports the error once per runId.
 *
 * Too many trace errors may indicate the user is having trouble creating/editing a mod.
 */
function useReportTraceError(): void {
  const sessionId = useSelector(selectSessionId);
  const traceErrors = useSelector(selectTraceErrors);

  const traceError = traceErrors.find((x) => x.runId);
  const runId = traceError?.runId;
  const prevRunId = usePreviousValue(runId);
  if (traceError && runId && runId !== prevRunId) {
    reportEvent(Events.PAGE_EDITOR_MOD_COMPONENT_ERROR, {
      sessionId,
      modComponentId: traceError.extensionId,
    });
  }
}

export default useReportTraceError;
