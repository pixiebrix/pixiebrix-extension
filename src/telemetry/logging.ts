/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { type DBSchema, type IDBPDatabase, openDB } from "idb/with-async-ittr";
import { isEmpty, once, sortBy } from "lodash";
import { allowsTrack } from "@/telemetry/dnt";
import {
  getErrorMessage,
  hasSpecificErrorCause,
  isSpecificError,
} from "@/errors/errorHelpers";
import { expectContext } from "@/utils/expectContext";
import {
  reportToErrorService,
  selectExtraContext,
} from "@/services/errorService";
import { BusinessError } from "@/errors/businessErrors";
import { ContextError } from "@/errors/genericErrors";
import { isAxiosError } from "@/errors/networkErrorHelpers";
import { type MessengerMeta } from "webext-messenger";
import { type SerializedError } from "@/types/messengerTypes";
import { type MessageContext } from "@/types/loggerTypes";
import { type UUID } from "@/types/stringTypes";
import { deleteDatabase } from "@/utils/idbUtils";
import { memoizeUntilSettled } from "@/utils/promiseUtils";
import { StorageItem } from "webext-storage";
import { flagOn } from "@/auth/authUtils";

const DATABASE_NAME = "LOG";
const ENTRY_OBJECT_STORE = "entries";
const DB_VERSION_NUMBER = 3;
/**
 * Maximum number of most recent logs to keep in the database. A low-enough number that performance should not be
 * impacted due to the number of entries.
 */
const MAX_LOG_RECORDS = 1250;

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
      extensionId: string;
      blueprintId: string;
      blockId: string;
      extensionPointId: string;
      serviceId: string;
      authId: string;
    };
  };
}

type IndexKey = keyof Except<
  MessageContext,
  | "deploymentId"
  | "label"
  | "pageName"
  | "blueprintVersion"
  | "blockVersion"
  | "serviceVersion"
  | "extensionLabel"
>;
const indexKeys: IndexKey[] = [
  "extensionId",
  "blueprintId",
  "blockId",
  "extensionPointId",
  "serviceId",
  "authId",
];

async function openLoggingDB() {
  // Always return a new DB connection. IDB performance seems to be better than reusing the same connection.
  // https://stackoverflow.com/questions/21418954/is-it-bad-to-open-several-database-connections-in-indexeddb
  let database: IDBPDatabase<LogDB> | null = null;

  database = await openDB<LogDB>(DATABASE_NAME, DB_VERSION_NUMBER, {
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
        // Not sure what will happen if the store doesn't exist (i.e., on initial install, so just NOP it
      }

      // Create a store of objects
      const store = db.createObjectStore(ENTRY_OBJECT_STORE, {
        keyPath: "uuid",
      });

      for (const key of indexKeys) {
        store.createIndex(key, `context.${key}`, {
          unique: false,
        });
      }
    },
    blocking() {
      // Don't block closing/upgrading the database
      console.debug("Closing log database due to upgrade/delete");
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

/**
 * Add a log entry to the database.
 * @param entry the log entry to add
 */
export async function appendEntry(entry: LogEntry): Promise<void> {
  const db = await openLoggingDB();
  try {
    await db.add(ENTRY_OBJECT_STORE, entry);
  } finally {
    db.close();
  }
}

function makeMatchEntry(
  context: MessageContext = {}
): (entry: LogEntry) => boolean {
  return (entry: LogEntry) =>
    indexKeys.every((key) => {
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
  const db = await openLoggingDB();
  try {
    return await db.count(ENTRY_OBJECT_STORE);
  } finally {
    db.close();
  }
}

/**
 * Deletes and recreates the logging database.
 */
export async function recreateDB(): Promise<void> {
  await deleteDatabase(DATABASE_NAME);

  // Open the database to recreate it
  const db = await openLoggingDB();
  db.close();
}

/**
 * Clears all log entries from the database.
 */
export async function clearLogs(): Promise<void> {
  const db = await openLoggingDB();
  try {
    await db.clear(ENTRY_OBJECT_STORE);
  } finally {
    db.close();
  }
}

/**
 * Clear logs matching a given context, for example a specific mod.
 * @param context the query context to clear.
 */
export async function clearLog(context: MessageContext = {}): Promise<void> {
  const db = await openLoggingDB();

  try {
    const tx = db.transaction(ENTRY_OBJECT_STORE, "readwrite");

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
  } finally {
    db.close();
  }
}

/**
 * Returns log entries matching the given context.
 * @param context the query log entry context
 */
export async function getLogEntries(
  context: MessageContext = {}
): Promise<LogEntry[]> {
  const db = await openLoggingDB();

  try {
    const objectStore = db
      .transaction(ENTRY_OBJECT_STORE, "readonly")
      .objectStore(ENTRY_OBJECT_STORE);

    let indexKey: IndexKey;
    for (const key of indexKeys) {
      // eslint-disable-next-line security/detect-object-injection -- indexKeys is compile-time constant
      if (context[key] != null) {
        indexKey = key;
        break;
      }
    }

    if (!indexKey) {
      throw new Error(
        "At least one of the known index keys must be set in the context to get logs"
      );
    }

    // Use the index to do an initial filter on IDB, and then makeMatchEntry to apply the full filter in JS.
    // eslint-disable-next-line security/detect-object-injection -- indexKeys is compile-time constant
    const entries = await objectStore.index(indexKey).getAll(context[indexKey]);

    const match = makeMatchEntry(context);
    const matches = entries.filter((entry) => match(entry));

    // Use both reverse and sortBy because we want insertion order if there's a tie in the timestamp
    return sortBy(matches.reverse(), (x) => -Number.parseInt(x.timestamp, 10));
  } finally {
    db.close();
  }
}

/**
 * Unroll/flatten the context of nested `ContextErrors`
 * @see SerializedError
 */
function flattenContext(
  error: Error | SerializedError,
  context: MessageContext
): MessageContext {
  if (isSpecificError(error, ContextError)) {
    const currentContext =
      typeof error.context === "object" ? error.context : {};
    const innerContext = flattenContext(
      error.cause as SerializedError,
      context
    );
    // Prefer the outer context which should have the most accurate detail about which brick the error occurred in
    return { ...context, ...innerContext, ...currentContext };
  }

  return context;
}

const warnAboutDisabledDNT = once(() => {
  console.warn("Rollbar telemetry is disabled because DNT is turned on");
});

const THROTTLE_AXIOS_SERVER_ERROR_STATUS_CODES = new Set([502, 503, 504]);
const THROTTLE_RATE_MS = 60_000; // 1 minute
let lastAxiosServerErrorTimestamp: number = null;

/**
 * Do not use this function directly. Use `reportError` instead: `import reportError from "@/telemetry/reportError"`
 * It's only exported for testing.
 */
export async function reportToRollbar(
  // Ensure it's an Error instance before passing it to Rollbar so rollbar treats it as the error.
  // (It treats POJO as the custom data)
  // See https://docs.rollbar.com/docs/rollbarjs-configuration-reference#rollbarlog
  error: Error,
  flatContext: MessageContext,
  message: string
): Promise<void> {
  // Business errors are now sent to the PixieBrix error service instead of Rollbar - see reportToErrorService
  if (
    hasSpecificErrorCause(error, BusinessError) ||
    (await flagOn("rollbar-disable-report"))
  ) {
    return;
  }

  // Throttle certain Axios status codes because they are redundant with our platform alerts
  if (
    isAxiosError(error) &&
    THROTTLE_AXIOS_SERVER_ERROR_STATUS_CODES.has(error.response?.status)
  ) {
    // JS allows subtracting dates directly but TS complains, so get the date as a number in milliseconds:
    // https://github.com/microsoft/TypeScript/issues/8260
    const now = Date.now();

    if (
      lastAxiosServerErrorTimestamp &&
      now - lastAxiosServerErrorTimestamp < THROTTLE_RATE_MS
    ) {
      console.debug("Skipping Rollbar report due to throttling");
      return;
    }

    lastAxiosServerErrorTimestamp = now;
  }

  if (!(await allowsTrack())) {
    warnAboutDisabledDNT();
    return;
  }

  // WARNING: the prototype chain is lost during deserialization, so make sure any predicates you call here
  // to determine log level also handle serialized/deserialized errors.
  // See https://github.com/sindresorhus/serialize-error/issues/48

  const { getRollbar } = await import(
    /* webpackChunkName: "rollbar" */
    "@/telemetry/initRollbar"
  );

  const rollbar = await getRollbar();
  const details = await selectExtraContext(error);

  rollbar.error(message, error, { ...flatContext, ...details });
}

/** @deprecated Use instead: `import reportError from "@/telemetry/reportError"` */
export async function recordError(
  this: MessengerMeta, // Enforce usage via Messenger only
  serializedError: SerializedError,
  context: MessageContext,
  data?: JsonObject
  // NOTE: If this function signature is changed, also update it in sidebar/messenger/registration.ts
  // If those types are removed from that file, then also remove this comment.
): Promise<void> {
  // See https://github.com/pixiebrix/pixiebrix-extension/pull/4696#discussion_r1030668438
  expectContext(
    "background",
    "Errors should be recorded via the background page to allow HTTP request batching"
  );

  try {
    const error = deserializeError(serializedError);
    const message = getErrorMessage(error);
    const flatContext = flattenContext(error, context);

    await Promise.all([
      reportToRollbar(error, flatContext, message),
      reportToErrorService(error, flatContext, message),
      appendEntry({
        uuid: uuidv4(),
        timestamp: Date.now().toString(),
        level: "error",
        context: flatContext,
        message,
        data,
        // Ensure the object is fully serialized. Required because it will be stored in IDB and flow through the Redux state
        error: serializedError,
      }),
    ]);
  } catch (recordErrorError) {
    console.error("An error occurred while recording another error", {
      error: recordErrorError,
      originalError: serializedError,
      context,
    });
  }
}

export async function recordWarning(
  this: MessengerMeta, // Enforce usage via Messenger only
  context: MessageContext | null,
  message: string,
  data?: JsonObject
) {
  // See https://github.com/pixiebrix/pixiebrix-extension/pull/4696#discussion_r1030668438
  expectContext(
    "background",
    "Errors should be recorded via the background page to allow HTTP request batching"
  );

  void recordLog(context, "warn", message, data);

  if (!(await allowsTrack())) {
    warnAboutDisabledDNT();
    return;
  }

  const { getRollbar } = await import(
    /* webpackChunkName: "rollbar" */
    "@/telemetry/initRollbar"
  );

  const rollbar = await getRollbar();
  rollbar.warning(message, data);
}

export async function recordLog(
  context: MessageContext,
  level: MessageLevel,
  message: string,
  data: JsonObject
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

export const loggingConfig = new StorageItem<LoggingConfig>("LOG_OPTIONS", {
  defaultValue: {
    logValues: false,
  },
});

/**
 * Clear all debug and trace level logs for the given extension.
 */
export async function clearExtensionDebugLogs(
  extensionId: UUID
): Promise<void> {
  const db = await openLoggingDB();

  try {
    const tx = db.transaction(ENTRY_OBJECT_STORE, "readwrite");
    const index = tx.store.index("extensionId");
    for await (const cursor of index.iterate(extensionId)) {
      if (cursor.value.level === "debug" || cursor.value.level === "trace") {
        await cursor.delete();
      }
    }
  } finally {
    db.close();
  }
}

/**
 * Free up space in the log database.
 */
async function _sweepLogs(): Promise<void> {
  const numRecords = await count();

  if (numRecords > MAX_LOG_RECORDS) {
    const numToDelete = numRecords - MAX_LOG_RECORDS * LOG_STORAGE_RATIO;

    console.debug("Sweeping logs", {
      numRecords,
      numToDelete,
    });

    const db = await openLoggingDB();

    try {
      const tx = db.transaction(ENTRY_OBJECT_STORE, "readwrite");

      let deletedCount = 0;

      // Ideally this would be ordered by timestamp to delete the oldest records, but timestamp is not an index.
      // This might mostly "just work" if the cursor happens to iterate in insertion order
      for await (const cursor of tx.store) {
        await cursor.delete();
        deletedCount++;

        if (deletedCount > numToDelete) {
          return;
        }
      }
    } finally {
      db.close();
    }
  }
}

/**
 * Free up space in the log database.
 */
export const sweepLogs = memoizeUntilSettled(_sweepLogs);

export function initLogSweep(): void {
  expectContext(
    "background",
    "Log sweep should only be initialized in the background page"
  );

  // Sweep after initial extension startup
  setTimeout(sweepLogs, 5000);
  // Sweep logs every 5 minutes
  setInterval(sweepLogs, 300_000);
}
