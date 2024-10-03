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

import { uuidv4 } from "@/types/helpers";
import { type Except, type JsonObject } from "type-fest";
import { deserializeError } from "serialize-error";
import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import { isEmpty, sortBy } from "lodash";
import { getErrorMessage, isSpecificError } from "@/errors/errorHelpers";
import { expectContext } from "@/utils/expectContext";
import { reportToErrorService } from "@/data/service/errorService";
import { ContextError } from "@/errors/genericErrors";
import { type MessengerMeta } from "webext-messenger";
import { type SerializedError } from "@/types/messengerTypes";
import { type MessageContext } from "@/types/loggerTypes";
import { type UUID } from "@/types/stringTypes";
import {
  DATABASE_NAME,
  deleteDatabase,
  IDB_OPERATION,
  isIDBConnectionError,
  isIDBLargeValueError,
  withIdbErrorHandling,
} from "@/utils/idbUtils";
import { memoizeUntilSettled } from "@/utils/promiseUtils";
import { StorageItem } from "webext-storage";
import { flagOn } from "@/auth/featureFlagStorage";
import { FeatureFlags } from "@/auth/featureFlags";
import { reportToApplicationErrorTelemetry } from "@/telemetry/reportToApplicationErrorTelemetry";

const ENTRY_OBJECT_STORE = "entries";
const DB_VERSION_NUMBER = 4;
/**
 * Maximum number of most recent logs to keep in the database. A low-enough number that performance should not be
 * impacted due to the number of entries.
 */
const MAX_LOG_RECORDS = 1250;
// How many log entries to delete at a time with each transaction.
const SWEEP_LOGS_BATCH_SIZE = 10;

/**
 * Amount to clear old logs, as a ratio of the maximum number of logs.
 */
const LOG_STORAGE_RATIO = 0.75;

export type MessageLevel = "trace" | "debug" | "info" | "warn" | "error";

export const LOG_LEVELS: { [key in MessageLevel]: number } = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

export type LogEntry = {
  uuid: string;
  timestamp: string;
  message: string;
  level: MessageLevel;
  context: MessageContext;
  data?: JsonObject;
  error?: SerializedError;
};

interface LogDB extends DBSchema {
  [ENTRY_OBJECT_STORE]: {
    value: LogEntry;
    key: string;
    indexes: {
      modComponentId: string;
      modId: string;
      brickId: string;
      starterBrickId: string;
      integrationId: string;
      authId: string;
    };
  };
}

type IndexKey = keyof Except<
  MessageContext,
  | "deploymentId"
  | "label"
  | "pageName"
  | "modVersion"
  | "brickVersion"
  | "integrationVersion"
  | "modComponentLabel"
  | "platformName"
  | "url"
  | "connectionType"
  | "referrer"
>;

const INDEX_KEYS = [
  "modComponentId",
  "modId",
  "brickId",
  "starterBrickId",
  "integrationId",
  "authId",
] as const satisfies IndexKey[];

async function openLoggingDB() {
  // Always return a new DB connection. IDB performance seems to be better than reusing the same connection.
  // https://stackoverflow.com/questions/21418954/is-it-bad-to-open-several-database-connections-in-indexeddb
  let database: IDBPDatabase<LogDB> | null = null;

  database = await openDB<LogDB>(DATABASE_NAME.LOG, DB_VERSION_NUMBER, {
    upgrade(db, oldVersion, newVersion) {
      try {
        // For now, just clear local logs whenever we need to upgrade the log database structure. There's no real use
        // cases for looking at historic local logs
        db.deleteObjectStore(ENTRY_OBJECT_STORE);
        console.warn(
          "Deleting object store %s for upgrade",
          ENTRY_OBJECT_STORE,
          { oldVersion, newVersion },
        );
      } catch {
        // Not sure what will happen if the store doesn't exist (i.e., on initial install, so just NOP it
      }

      // Create a store of objects
      const store = db.createObjectStore(ENTRY_OBJECT_STORE, {
        keyPath: "uuid",
      });

      for (const key of INDEX_KEYS) {
        store.createIndex(key, `context.${key}`, {
          unique: false,
        });
      }
    },
    blocked(currentVersion: number, blockedVersion: number) {
      console.debug("Database blocked.", { currentVersion, blockedVersion });
      // This should never happen, since we immediately close connections if blocking below,
      // but just in case, close the connection here so it doesn't block openLoggingDB from
      // resolving
      database?.close();
    },
    blocking(currentVersion: number, blockedVersion: number) {
      // Don't block closing/upgrading the database
      console.debug("Closing log database due to upgrade/delete.", {
        currentVersion,
        blockedVersion,
      });
      database?.close();
      database = null;
    },
    terminated() {
      console.debug("Log database connection was unexpectedly terminated");
      database = null;
    },
  });

  database.addEventListener("close", () => {
    database = null;
  });

  return database;
}

// eslint-disable-next-line local-rules/persistBackgroundData -- Function
const withLoggingDB = withIdbErrorHandling(openLoggingDB, DATABASE_NAME.LOG);
/**
 * Add a log entry to the database.
 * @param entry the log entry to add
 */
export async function appendEntry(entry: LogEntry): Promise<void> {
  if (await flagOn(FeatureFlags.DISABLE_IDB_LOGGING)) {
    return;
  }

  await withLoggingDB(
    async (db) => {
      await db.add(ENTRY_OBJECT_STORE, entry);
    },
    {
      operationName: IDB_OPERATION.LOG.APPEND_ENTRY,
      shouldRetry: (error) =>
        isIDBConnectionError(error) || isIDBLargeValueError(error),
    },
  ).catch((_error) => {
    // Swallow error because we've reported it to application error telemetry
  });
}

function makeMatchEntry(
  context: MessageContext = {},
): (entry: LogEntry) => boolean {
  return (entry: LogEntry) =>
    INDEX_KEYS.every((key) => {
      // eslint-disable-next-line security/detect-object-injection -- indexKeys is compile-time constant
      const toMatch = context[key];
      // eslint-disable-next-line security/detect-object-injection -- indexKeys is compile-time constant
      return toMatch == null || entry.context?.[key] === toMatch;
    });
}

/**
 * Returns the number of log entries in the database.
 */
export async function count(): Promise<number> {
  return withLoggingDB(async (db) => db.count(ENTRY_OBJECT_STORE), {
    operationName: IDB_OPERATION.LOG.COUNT,
  });
}

/**
 * Deletes and recreates the logging database.
 */
export async function recreateDB(): Promise<void> {
  await deleteDatabase(DATABASE_NAME.LOG);
  // Open the database to recreate it
  await withLoggingDB(async (_db) => {}, {
    operationName: IDB_OPERATION.LOG.RECREATE_DB,
  });
}

/**
 * Clears all log entries from the database.
 */
export async function clearLogs(): Promise<void> {
  await withLoggingDB(
    async (db) => {
      await db.clear(ENTRY_OBJECT_STORE);
    },
    { operationName: IDB_OPERATION.LOG.CLEAR_LOGS },
  ).catch((_error) => {
    // Swallow error because we've reported it to application error telemetry
  });
}

/**
 * Clear logs matching a given context, for example a specific mod.
 * @param context the query context to clear.
 */
export async function clearLog(context: MessageContext = {}): Promise<void> {
  await withLoggingDB(
    async (db) => {
      const tx = db.transaction(ENTRY_OBJECT_STORE, "readwrite", {
        durability: "relaxed",
      });

      if (isEmpty(context)) {
        await tx.store.clear();
        return;
      }

      const match = makeMatchEntry(context);
      for await (const cursor of tx.store) {
        if (match(cursor.value)) {
          await cursor.delete();
        }
      }
    },
    { operationName: IDB_OPERATION.LOG.CLEAR_LOG },
  ).catch((_error) => {
    // Swallow error because we've reported it to application error telemetry
  });
}

/**
 * Returns log entries matching the given context.
 * @param context the query log entry context
 */
export async function getLogEntries(
  context: MessageContext = {},
): Promise<LogEntry[]> {
  return withLoggingDB(
    async (db) => {
      const objectStore = db
        .transaction(ENTRY_OBJECT_STORE, "readonly", {
          durability: "relaxed",
        })
        .objectStore(ENTRY_OBJECT_STORE);

      let indexKey: IndexKey | undefined;
      for (const key of INDEX_KEYS) {
        // eslint-disable-next-line security/detect-object-injection -- indexKeys is compile-time constant
        if (context[key] != null) {
          indexKey = key;
          break;
        }
      }

      if (!indexKey) {
        throw new Error(
          "At least one of the known index keys must be set in the context to get logs",
        );
      }

      // Use the index to do an initial filter on IDB, and then makeMatchEntry to apply the full filter in JS.

      const entries = await objectStore
        .index(indexKey)
        .getAll(context[indexKey]);

      const match = makeMatchEntry(context);
      const matches = entries.filter((entry) => match(entry));

      // Use both reverse and sortBy because we want insertion order if there's a tie in the timestamp
      return sortBy(
        matches.reverse(),
        (x) => -Number.parseInt(x.timestamp, 10),
      );
    },
    {
      operationName: IDB_OPERATION.LOG.GET_LOG_ENTRIES,
      shouldRetry: (error) =>
        isIDBConnectionError(error) || isIDBLargeValueError(error),
    },
  );
}

/**
 * Unroll/flatten the context of nested `ContextErrors`
 * @see SerializedError
 */
function flattenContext(
  error: Error | SerializedError,
  context: MessageContext,
): MessageContext {
  if (isSpecificError(error, ContextError)) {
    const currentContext =
      typeof error.context === "object" ? error.context : {};
    const innerContext = flattenContext(
      error.cause as SerializedError,
      context,
    );
    // Prefer the outer context which should have the most accurate detail about which brick the error occurred in
    return { ...context, ...innerContext, ...currentContext };
  }

  return context;
}

export type ContextWithMod = MessageContext &
  Required<Pick<MessageContext, "modComponentId">>;
const isContextWithMod = (context: MessageContext): context is ContextWithMod =>
  context.modComponentId != null;

/** @deprecated Use instead: `import reportError from "@/telemetry/reportError"` */
export async function recordError(
  this: MessengerMeta, // Enforce usage via Messenger only
  serializedError: SerializedError,
  context: MessageContext,
  data?: JsonObject,
  // NOTE: If this function signature is changed, also update it in sidebar/messenger/registration.ts
  // If those types are removed from that file, then also remove this comment.
): Promise<void> {
  // See https://github.com/pixiebrix/pixiebrix-extension/pull/4696#discussion_r1030668438
  expectContext(
    "background",
    "Errors should be recorded via the background page to allow HTTP request batching",
  );

  try {
    const error = deserializeError(serializedError);
    const errorMessage = getErrorMessage(error);
    const flatContext = flattenContext(error, context);

    // Only record entries that occurred within a user-defined extension/blueprint.
    // Other errors only go to Application error telemetry. (They're problems with our software.)
    const reportModErrorPromises = isContextWithMod(flatContext)
      ? [
          reportToErrorService(error, flatContext, errorMessage),
          appendEntry({
            uuid: uuidv4(),
            timestamp: Date.now().toString(),
            level: "error",
            context: flatContext,
            message: errorMessage,
            data,
            // Ensure the object is fully serialized. Required because it will be stored in IDB and flow through the Redux state
            error: serializedError,
          }),
        ]
      : [];

    await Promise.all([
      reportToApplicationErrorTelemetry(error, flatContext, errorMessage),
      ...reportModErrorPromises,
    ]);
  } catch (recordErrorError) {
    console.error("An error occurred while recording another error", {
      error: recordErrorError,
      originalError: serializedError,
      context,
    });
  }
}

export async function recordLog(
  context: MessageContext,
  level: MessageLevel,
  message: string,
  data: JsonObject,
): Promise<void> {
  await appendEntry({
    uuid: uuidv4(),
    timestamp: Date.now().toString(),
    level,
    message,
    data,
    context: context ?? {},
  });
}

export type LoggingConfig = {
  logValues: boolean;
};

const loggingConfig = new StorageItem<LoggingConfig>("LOG_OPTIONS", {
  defaultValue: {
    logValues: false,
  },
});

let lastValue: LoggingConfig | null = null;
export async function getLoggingConfig(): Promise<LoggingConfig> {
  try {
    lastValue = await loggingConfig.get();
    return lastValue;
  } catch {
    // The context was probably invalidated. Logging utilities shouldn't throw errors
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Incomplete types
    return lastValue ?? loggingConfig.defaultValue!;
  }
}

export async function setLoggingConfig(config: LoggingConfig): Promise<void> {
  await loggingConfig.set(config);
}

/**
 * Clear all debug and trace level logs for the given mod component.
 */
export async function clearModComponentDebugLogs(
  modComponentId: UUID,
): Promise<void> {
  if (await flagOn(FeatureFlags.DISABLE_IDB_LOGGING)) {
    return;
  }

  await withLoggingDB(
    async (db) => {
      const tx = db.transaction(ENTRY_OBJECT_STORE, "readwrite", {
        durability: "relaxed",
      });
      const index = tx.store.index("modComponentId");
      for await (const cursor of index.iterate(modComponentId)) {
        if (cursor.value.level === "debug" || cursor.value.level === "trace") {
          await cursor.delete();
        }
      }
    },
    { operationName: IDB_OPERATION.LOG.CLEAR_MOD_COMPONENT_DEBUG_LOGS },
  ).catch((_error) => {
    // Swallow error because we've reported it to application error telemetry, and
    // we don't want to interrupt the execution of mod pipeline
  });
}

/**
 * Free up space in the log database.
 */
async function _sweepLogs(): Promise<void> {
  if (await flagOn(FeatureFlags.DISABLE_IDB_LOGGING)) {
    return;
  }

  await withLoggingDB(
    async (db) => {
      const numRecords = await db.count(ENTRY_OBJECT_STORE);

      if (numRecords > MAX_LOG_RECORDS) {
        const numToDelete = numRecords - MAX_LOG_RECORDS * LOG_STORAGE_RATIO;

        console.debug("Sweeping logs", {
          numRecords,
          numToDelete,
        });

        // Ensure in cases where the sweep is taking too long, we abort the operation to reduce the likelihood
        // of blocking other db transactions.
        const abortController = new AbortController();
        setTimeout(() => {
          abortController.abort();
        }, 10_000);

        let deletedCount = 0;

        while (deletedCount < numToDelete) {
          const tx = db.transaction(ENTRY_OBJECT_STORE, "readwrite", {
            durability: "relaxed",
          });

          let processedBatchCount = 0;
          // Ideally this would be ordered by timestamp to delete the oldest records, but timestamp is not an index.
          // This might mostly "just work" if the cursor happens to iterate in insertion order
          // eslint-disable-next-line no-await-in-loop -- Process one entry at a time
          for await (const cursor of tx.store) {
            if (abortController.signal.aborted) {
              console.warn("Log sweep aborted due to timeout");
              return;
            }

            await cursor.delete();
            deletedCount++;
            processedBatchCount++;

            if (processedBatchCount >= SWEEP_LOGS_BATCH_SIZE) {
              break;
            }
          }
        }
      }
    },
    { operationName: IDB_OPERATION.LOG.SWEEP_LOGS },
  ).catch((_error) => {
    // Swallow error because we've reported it to application error telemetry
  });
}

/**
 * Free up space in the log database.
 */
export const sweepLogs = memoizeUntilSettled(_sweepLogs);

export function initLogSweep(): void {
  expectContext(
    "background",
    "Log sweep should only be initialized in the background page",
  );

  // Sweep after initial extension startup
  setTimeout(sweepLogs, 5000);
  // Sweep logs every 5 minutes
  setInterval(sweepLogs, 300_000);
}
