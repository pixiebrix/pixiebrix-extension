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

import React, { useEffect, useRef } from "react";
import { getByInstanceId } from "@/telemetry/trace";
import { useAsyncState } from "@/hooks/common";
import { UUID } from "@/core";
import { sortBy } from "lodash";
import GridLoader from "react-spinners/GridLoader";
import { getErrorMessage } from "@/errors";
import JsonTree from "@/components/JsonTree";

// https://overreacted.io/making-setinterval-declarative-with-react-hooks/
function useInterval(callback: () => void, delayMillis: number) {
  const savedCallback = useRef<() => void>();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }

    if (delayMillis !== null) {
      const id = setInterval(tick, delayMillis);
      return () => {
        clearInterval(id);
      };
    }
  }, [delayMillis]);
}

const TraceView: React.FunctionComponent<{ instanceId: UUID }> = ({
  instanceId,
}) => {
  const [record, isLoading, error, recalculate] = useAsyncState(async () => {
    if (instanceId == null) {
      throw new Error("No instance id found");
    }

    const records = await getByInstanceId(instanceId);
    return sortBy(records, (x) => new Date(x.timestamp)).reverse()[0];
  }, [instanceId]);

  useInterval(recalculate, 1000);

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
    <div className="d-flex">
      <div>
        <JsonTree data={record.renderedArgs} />
      </div>
      <div>
        {"output" in record && <JsonTree data={record.output} />}

        {"error" in record && <JsonTree data={record.error} />}
      </div>
    </div>
  );
};

export default TraceView;
