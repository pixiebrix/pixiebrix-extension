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

import { TraceRecord } from "@/telemetry/trace";
import { isEqual, reverse, sortBy } from "lodash";
import { Branch } from "@/blocks/types";

/**
 * Given records for a single runId and blockInstanceId, return the latest call to a given blockInstanceId.
 * @param records the trace records
 */
export function getLatestCall(records: TraceRecord[]): TraceRecord | null {
  const ascending = sortBy(records, (x) =>
    x.branches.flatMap((branch) => [branch.key, branch.counter])
  );
  return reverse(ascending)[0];
}

export function hasBranchPrefix(
  prefix: Branch[],
  record: TraceRecord
): boolean {
  // eslint-disable-next-line security/detect-object-injection -- index is a number
  return prefix.every(
    (branch, index) =>
      index < record.branches.length && isEqual(branch, record.branches[index])
  );
}

export function filterTracesByCall(
  records: TraceRecord[],
  callBranches: Branch[]
): TraceRecord[] {
  return records.filter((record) => hasBranchPrefix(callBranches, record));
}
