/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React from "react";
import { UUID } from "@/core";
import GridLoader from "react-spinners/GridLoader";
import { getErrorMessage } from "@/errors";
import JsonTree from "@/components/JsonTree";
import useInterval from "@/hooks/useInterval";
import { useTrace } from "@/devTools/editor/tabs/effect/useTrace";

const TraceView: React.FunctionComponent<{
  instanceId: UUID;
  traceReloadMillis?: number;
}> = ({ instanceId, traceReloadMillis = 750 }) => {
  const { record, isLoading, error, recalculate } = useTrace(instanceId);

  useInterval(recalculate, traceReloadMillis);

  if (isLoading) {
    return (
      <div>
        <GridLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-danger">
        Error loading trace: {getErrorMessage(error)}
      </div>
    );
  }

  if (!record) {
    return <div className="text-muted">No trace available</div>;
  }

  return (
    <div className="row">
      <div className="col-4 overflow-auto">
        <span>Context</span>
        <JsonTree data={record.templateContext} />
      </div>

      <div className="col-4 overflow-auto">
        <span>Rendered Arguments</span>
        <JsonTree data={record.renderedArgs} />
      </div>

      <div className="col-4 overflow-auto">
        {"output" in record && (
          <>
            <span>Output</span>
            <JsonTree data={record.output} />
          </>
        )}

        {"error" in record && (
          <>
            <span>Error</span>
            <JsonTree data={record.error} />
          </>
        )}
      </div>
    </div>
  );
};

export default TraceView;
