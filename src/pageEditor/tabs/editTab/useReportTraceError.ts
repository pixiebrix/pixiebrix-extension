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

import { selectTraceErrors } from "@/pageEditor/slices/runtimeSelectors";
import { selectSessionId } from "@/pageEditor/slices/sessionSelectors";
import { reportEvent } from "@/telemetry/events";
import { useEffect } from "react";
import { useSelector } from "react-redux";

function useReportTraceError() {
  const sessionId = useSelector(selectSessionId);
  const traceErrors = useSelector(selectTraceErrors);

  const traceError = traceErrors.find((x) => x.runId);
  const runId = traceError?.runId ?? null;

  useEffect(() => {
    if (traceError) {
      reportEvent("PageEditorExtensionError", {
        sessionId,
        extensionId: traceError.extensionId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- traceError is not required, runId is sufficient
  }, [runId, sessionId]);
}

export default useReportTraceError;
