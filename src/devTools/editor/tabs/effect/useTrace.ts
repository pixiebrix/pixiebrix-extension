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

import { useAsyncState } from "@/hooks/common";
import { getByInstanceId, TraceRecord } from "@/telemetry/trace";
import { sortBy } from "lodash";
import { UUID } from "@/core";

type TraceState = {
  // TODO: add `isOutdated` flag based on the redux/formik state
  record: TraceRecord;
  isLoading: boolean;
  error: unknown;
  recalculate: () => Promise<void>;
};

export function useTrace(instanceId: UUID): TraceState {
  const [record, isLoading, error, recalculate] = useAsyncState(async () => {
    if (instanceId == null) {
      throw new Error("No instance id found");
    }

    const records = await getByInstanceId(instanceId);
    return sortBy(records, (x) => new Date(x.timestamp)).reverse()[0];
  }, [instanceId]);

  return {
    record,
    isLoading,
    error,
    recalculate,
  };
}
