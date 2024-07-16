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

import { type TraceRecord } from "@/telemetry/trace";
import { isEqual, reverse, sortBy } from "lodash";
import { type UUID } from "@/types/stringTypes";
import { type Branch } from "@/types/runtimeTypes";

/**
 * Given records for a single runId and blockInstanceId, return the latest call to a given blockInstanceId.
 * @param records the trace records
 */
export function getLatestCall(records: TraceRecord[]): TraceRecord | undefined {
  const ascending = sortBy(records, (x) =>
    x.branches.flatMap((branch) => [branch.key, branch.counter]),
  );
  return reverse(ascending)[0];
}

/**
 * Returns trace record for the latest call to the given brickInstanceId, or undefined if one does not exist
 * @param records the trace records
 * @param blockInstanceId the block instanceid
 */
export function getLatestBrickCall(
  records: TraceRecord[],
  blockInstanceId: UUID | undefined,
): TraceRecord | undefined {
  return getLatestCall(
    records.filter(
      // Use first block in pipeline to determine the latest run
      (trace) => trace.brickInstanceId === blockInstanceId,
    ),
  );
}

/**
 * Returns true if a trace record matches the given branch prefix
 */
export function hasBranchPrefix(
  prefix: Branch[],
  record: TraceRecord,
): boolean {
  return prefix.every(
    (branch, index) =>
      index < record.branches.length &&
      isEqual(branch, record.branches.at(index)),
  );
}

/**
 * Returns trace records with a branch prefix that matches callBranches
 * @param records the trace records
 * @param callBranches the branch prefix to filter by
 */
export function filterTracesByCall(
  records: TraceRecord[],
  callBranches: Branch[] | null,
): TraceRecord[] {
  if (callBranches == null) {
    return [];
  }

  return records.filter((record) => hasBranchPrefix(callBranches, record));
}
