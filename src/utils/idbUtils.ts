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

import pDefer from "p-defer";
import { deleteDB, type IDBPDatabase } from "idb";
import { getErrorMessage } from "@/errors/errorHelpers";
import { type ValueOf } from "type-fest";
import { getReportErrorAdditionalContext } from "@/telemetry/reportError";
import { reportToApplicationErrorTelemetry } from "@/telemetry/reportToApplicationErrorTelemetry";
import castError from "@/utils/castError";
import pRetry, { type FailedAttemptError } from "p-retry";

// IDB Connection Error message strings
const CONNECTION_ERRORS = ["Error Opening IndexedDB"] as const;
const MAX_RETRIES = 3;

export const DATABASE_NAME = {
  LOG: "LOG",
  TRACE: "TRACE",
  PACKAGE_REGISTRY: "BRICK_REGISTRY",
  TELEMETRY: "telemetrydb",
} as const;

export const IDB_OPERATION = {
  [DATABASE_NAME.LOG]: {
    APPEND_ENTRY: "appendEntry",
    COUNT: "count",
    RECREATE_DB: "recreateDB",
    CLEAR_LOGS: "clearLogs",
    CLEAR_LOG: "clearLog",
    GET_LOG_ENTRIES: "getLogEntries",
    SWEEP_LOGS: "sweepLogs",
    CLEAR_MOD_COMPONENT_DEBUG_LOGS: "clearModComponentDebugLogs",
  },
  [DATABASE_NAME.TRACE]: {
    ADD_TRACE_ENTRY: "addTraceEntry",
    ADD_TRACE_EXIT: "addTraceExit",
    CLEAR_TRACES: "clearTraces",
    COUNT: "count",
    RECREATE_DB: "recreateDB",
    CLEAR_MOD_COMPONENT_TRACES: "clearModComponentTraces",
    GET_LATEST_RUN_BY_MOD_COMPONENT_ID: "getLatestRunByModComponentId",
  },
  [DATABASE_NAME.PACKAGE_REGISTRY]: {
    CLEAR: "clear",
    RECREATE_DB: "recreateDB",
    GET_BY_KINDS: "getByKinds",
    COUNT: "count",
    REPLACE_ALL: "replaceAll",
    FIND: "find",
  },
  [DATABASE_NAME.TELEMETRY]: {
    ADD_EVENT: "addEvent",
    FLUSH_EVENTS: "flushEvents",
    RECREATE_DB: "recreateDB",
    COUNT: "count",
    CLEAR: "clear",
  },
} as const satisfies Record<
  ValueOf<typeof DATABASE_NAME>,
  Record<string, string>
>;

type OperationNames =
  | ValueOf<(typeof IDB_OPERATION)[typeof DATABASE_NAME.LOG]>
  | ValueOf<(typeof IDB_OPERATION)[typeof DATABASE_NAME.TRACE]>
  | ValueOf<(typeof IDB_OPERATION)[typeof DATABASE_NAME.PACKAGE_REGISTRY]>
  | ValueOf<(typeof IDB_OPERATION)[typeof DATABASE_NAME.TELEMETRY]>;

// IDB Quota Error message strings
const QUOTA_ERRORS = [
  "Encountered full disk while opening backing store for indexedDB.open",
  "IndexedDB Full",
] as const;

/**
 * Delete an IndexedDB database.
 * @throws Error if the database cannot be deleted because it is in use
 */
export async function deleteDatabase(databaseName: string): Promise<void> {
  // :shrug: the deleteDB API is a bit weird, it appears to resolve even if the database can't be deleted because a
  // connection is open and blocking the deletion. This is a workaround.
  const deferred = pDefer<void>();
  const deletePromise = deleteDB(databaseName, {
    blocked() {
      deferred.reject(new Error(`Database ${databaseName} is in use`));
    },
  });
  await Promise.race([deletePromise, deferred.promise]);
}

/**
 * Returns true if the error corresponds to not being able to connect to IndexedDB, e.g., due to a corrupt database.
 * Does not include quota errors.
 * @param error the error object
 * @see isIDBQuotaError
 */
export function isIDBConnectionError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return CONNECTION_ERRORS.some((connectionError) =>
    message.includes(connectionError),
  );
}

/**
 * Returns true if the error corresponds to IndexedDB not having enough available quota.
 * @param error the error object
 * @see isIDBConnectionError
 */
export function isIDBQuotaError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return QUOTA_ERRORS.some((quotaError) => message.includes(quotaError));
}

/**
 * Before Chrome 130, there is no way to determine if the file is missing or if some other error occurred.
 * In Chrome 130 and later, the error message remains the same, the type of error is different.
 * NotFoundError if the file is missing, DataError for any other error.
 *
 * @see https://chromestatus.com/feature/5140210640486400
 * @param error the error object
 */
export function isIDBLargeValueError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return message.includes("Failed to read large IndexedDB value");
}

/**
 * Error occurring due to corrupt chrome profile but unclear how this happens.
 * This error seems to be unrecoverable and the only solution is to delete the database.
 * https://jasonsavard.com/forum/discussion/4233/unknownerror-internal-error-opening-backing-store-for-indexeddb-open
 *
 * @param error the error object
 */
function isIDBErrorOpeningBackingStore(error: unknown): boolean {
  const message = getErrorMessage(error);
  return message.includes(
    "Internal error opening backing store for indexedDB.open",
  );
}

/**
 * The large value error could be a NotFoundError or a DataError.
 * NotFoundError may be fixable on a case-by-case basis.
 * @see getByKinds
 * DataError and IDBConnectionErrors may be fixed by the retry.
 * @see https://issues.chromium.org/issues/342779913#comment8
 * @see isIDBLargeValueError
 */
export function isMaybeTemporaryIDBError(error: unknown): boolean {
  return isIDBConnectionError(error) || isIDBLargeValueError(error);
}

// Rather than use reportError from @/telemetry/reportError, IDB errors are directly reported
// to application error telemetry to avoid attempting to record the error in the idb log database.
function handleIdbError(
  error: unknown,
  {
    message,
    operationName,
    databaseName,
  }: {
    message: string;
    operationName: OperationNames;
    databaseName: ValueOf<typeof DATABASE_NAME>;
  },
): void {
  const errorMessage = getErrorMessage(error);
  const context = {
    idbOperationName: operationName,
    idbDatabaseName: databaseName,
    ...getReportErrorAdditionalContext(),
  };
  console.error(message, {
    operationName,
    databaseName,
    error,
    context,
  });
  void reportToApplicationErrorTelemetry(
    castError(error, message),
    context,
    errorMessage,
  );
}

export const withIdbErrorHandling =
  <DBType>(
    openIDB: () => Promise<IDBPDatabase<DBType>>,
    databaseName: ValueOf<typeof DATABASE_NAME>,
  ) =>
  async <DBOperationResult>(
    dbOperation: (db: IDBPDatabase<DBType>) => Promise<DBOperationResult>,
    {
      operationName,
      onFailedAttempt,
      shouldRetry,
    }: {
      operationName: OperationNames;
      onFailedAttempt?: (error: FailedAttemptError) => void | Promise<void>;
      shouldRetry?: (error: FailedAttemptError) => boolean | Promise<boolean>;
    },
  ) => {
    let db: IDBPDatabase<DBType> | null = null;

    try {
      return await pRetry(
        async () => {
          db = await openIDB();
          return dbOperation(db);
        },
        {
          retries: shouldRetry ? MAX_RETRIES : 0,
          // 'p-retry' does not handle an undefined shouldRetry correctly, so we need to ensure it is not passed if undefined
          // See: https://github.com/sindresorhus/p-retry/issues/36
          ...(shouldRetry ? { shouldRetry } : {}),
          async onFailedAttempt(error) {
            handleIdbError(error, {
              operationName,
              databaseName,
              message: `${operationName} failed for IDB database: ${databaseName}. Attempt Number: ${error.attemptNumber}`,
            });

            db?.close();

            await onFailedAttempt?.(error);
          },
        },
      );
    } catch (error) {
      if (
        // Large IndexedDB value error for a single DB entry can break bulk operations on the whole DB,
        // and we don't know of a way to drop the single bad record even if we know which one it is,
        // so we need to delete the whole database.
        isIDBLargeValueError(error) ||
        // "Internal error opening backing store for indexedDB.open" is an unrecoverable error that
        // requires deleting the database.
        isIDBErrorOpeningBackingStore(error)
      ) {
        console.error(
          `Deleting ${databaseName} database due to unrecoverable IndexDB error.`,
        );
        await deleteDatabase(databaseName);
      }

      throw error;
    } finally {
      (db as IDBDatabase | null)?.close();
    }
  };
