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

import { OutputKey, RegistryId, RenderedArgs, UUID } from "@/core";
import { JsonObject } from "type-fest";
import { DBSchema, openDB } from "idb/with-async-ittr";
import { sortBy } from "lodash";
import { BlockConfig } from "@/blocks/types";
import objectHash from "object-hash";

const STORAGE_KEY = "TRACE";
const ENTRY_OBJECT_STORE = "traces";
const DB_VERSION_NUMBER = 3;

export type TraceRecordMeta = {
  /**
   * Extension id, to correlate across extension runs.
   *
   * `null` for ad-hoc block execution.
   */
  extensionId: UUID | null;

  /**
   * Extension run id. Unique run id to correlate trace elements from the same extension run.
   */
  runId: UUID;

  /**
   * Branches to the brick execution
   *
   * Currently, two kinds of branches tracked
   * 1. defer
   * 2. pipeline (e.g., in if/else, document builder button, etc.)
   *
   * @since 1.7.0
   */
  branches: Array<{
    /**
     * Identifier for the branch. (Distinct from other branch ids for blockInstanceId, but not globally unique)
     */
    key: string;
    /**
     * Monotonically increasing counter
     */
    counter: number;
  }>;

  /**
   * Unique id to identify the block in the Page Editor across runs.
   */
  blockInstanceId: UUID;

  /**
   * The registry id of the block.
   */
  blockId: RegistryId;
};

type Output = {
  outputKey: OutputKey | null;

  /**
   * Output of the block
   */
  output: JsonObject | null;
};

type ErrorOutput = {
  /**
   * Serialized error from running the block
   */
  error: JsonObject;
};

/**
 *
 */
export type TraceEntryData = TraceRecordMeta & {
  /**
   * ISO timestamp when the trace element was recorded.
   */
  timestamp: string;

  templateContext: JsonObject;

  /**
   * The rendered args, or null if there was an error rendering the args
   */
  renderedArgs: RenderedArgs | null;

  /**
   * The error rendering the arguments
   */
  renderError: JsonObject | null;

  blockConfig: BlockConfig;
};

export type TraceExitData = TraceRecordMeta &
  (Output | ErrorOutput) & {
    /**
     * If a condition was specified and not met, this is `true`, otherwise `false`.
     */
    skippedRun: boolean;

    /**
     * `true` if the brick was skipped or finished running. Introduced to avoid gotchas with effect bricks which
     * produce a null/undefined result.
     * @since 1.7.0
     */
    isFinal: boolean;

    /**
     * `true` if the exit is because the result will run in the renderer
     * @since 1.7.0
     */
    isRenderer: boolean;
  };

type DerivedData = {
  /**
   * Unique identifier to distinguish calls to the same static brick in the same run
   * @since 1.7.0
   */
  callId: string;
};

export type TraceRecord = TraceEntryData & Partial<TraceExitData> & DerivedData;

export type TraceError = TraceEntryData & ErrorOutput & DerivedData;

export function isTraceError(
  traceRecord: TraceRecord
): traceRecord is TraceError {
  return "error" in traceRecord && traceRecord.error != null;
}

const indexKeys: Array<
  keyof Pick<TraceRecordMeta, "runId" | "blockInstanceId" | "extensionId">
> = ["runId", "blockInstanceId", "extensionId"];

interface TraceDB extends DBSchema {
  [ENTRY_OBJECT_STORE]: {
    value: TraceRecord;
    key: string;
    indexes: {
      runId: UUID;
      blockInstanceId: UUID;
      extensionId: UUID;
    };
  };
}

async function getDB() {
  return openDB<TraceDB>(STORAGE_KEY, DB_VERSION_NUMBER, {
    upgrade(db) {
      try {
        // For now, just clear local logs whenever we need to upgrade the log database structure. There's no real use
        // cases for looking at historic local logs
        db.deleteObjectStore(ENTRY_OBJECT_STORE);
        console.warn(
          "Deleting object store %s for upgrade",
          ENTRY_OBJECT_STORE
        );
      } catch {
        // Not sure what will happen if the store doesn't exist (i.e., on initial install, so just NOP it)
      }

      // Create a store of objects
      const store = db.createObjectStore(ENTRY_OBJECT_STORE, {
        keyPath: ["runId", "blockInstanceId", "callId"],
      });

      // Create individual indexes
      for (const indexKey of indexKeys) {
        store.createIndex(indexKey, indexKey, {
          unique: false,
        });
      }
    },
  });
}

export async function addTraceEntry(record: TraceEntryData): Promise<void> {
  if (!record.runId) {
    console.debug("Ignoring trace entry data without runId");
    return;
  }

  if (!record.blockInstanceId) {
    console.debug("Ignoring trace entry data without blockInstanceId");
    return;
  }

  const db = await getDB();
  const callId = objectHash(record.branches);
  await db.add(ENTRY_OBJECT_STORE, { ...record, callId });
}

export async function addTraceExit(record: TraceExitData): Promise<void> {
  if (!record.runId) {
    console.debug("Ignoring trace exit data without runId");
    return;
  }

  if (!record.blockInstanceId) {
    console.debug("Ignoring trace exit data without blockInstanceId");
    return;
  }

  const callId = objectHash(record.branches);

  const db = await getDB();

  const tx = db.transaction(ENTRY_OBJECT_STORE, "readwrite");

  const data = await tx.store.get([
    record.runId,
    record.blockInstanceId,
    callId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- types are wrong in idb?
  ] as any);

  if (data) {
    await tx.store.put({
      ...data,
      ...record,
      callId,
    });
  } else {
    console.warn("Trace entry record not found", {
      runId: record.runId,
      blockInstanceId: record.blockInstanceId,
      callId,
    });
  }
}

export async function clearTraces(): Promise<void> {
  const db = await getDB();

  const tx = db.transaction(ENTRY_OBJECT_STORE, "readwrite");
  await tx.store.clear();
}

export async function clearExtensionTraces(extensionId: UUID): Promise<void> {
  let cnt = 0;

  const db = await getDB();
  const tx = db.transaction(ENTRY_OBJECT_STORE, "readwrite");
  const index = tx.store.index("extensionId");
  for await (const cursor of index.iterate(extensionId)) {
    cnt++;
    await cursor.delete();
  }

  console.debug("Cleared %d trace entries for extension %s", cnt, extensionId);
}

export async function getLatestRunByExtensionId(
  extensionId: UUID
): Promise<TraceRecord[]> {
  const db = await getDB();
  const matches = await db
    .transaction(ENTRY_OBJECT_STORE, "readonly")
    .objectStore(ENTRY_OBJECT_STORE)
    .index("extensionId")
    .getAll(extensionId);

  // Use both reverse and sortBy because we want insertion order if there's a tie in the timestamp
  const sorted = sortBy(
    matches.reverse(),
    (x) => -new Date(x.timestamp).getTime()
  );

  if (sorted.length > 0) {
    const { runId } = sorted[0];
    return sorted.filter((x) => x.runId === runId);
  }

  return [];
}
