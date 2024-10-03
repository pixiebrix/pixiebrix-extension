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
 * @see https://chromestatus.com/feature/5140210640486400
 * @param error the error object
 */
export function isIDBLargeValueError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return message.includes("Failed to read large IndexedDB value");
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
      retry,
      onRetry,
      shouldRetry,
    }: {
      operationName: OperationNames;
      retry?: boolean;
      onRetry?: (error: FailedAttemptError) => void | Promise<void>;
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
          retries: retry ? MAX_RETRIES : 0,
          shouldRetry,
          async onFailedAttempt(error) {
            handleIdbError(error, {
              operationName,
              databaseName,
              message: `${operationName} failed for IDB database: ${databaseName}. Retrying... Attempt ${error.attemptNumber}`,
            });

            db?.close();

            await onRetry?.(error);
          },
        },
      );
    } catch (error) {
      handleIdbError(error, {
        operationName,
        databaseName,
        message: `${operationName} failed for IDB database ${databaseName}`,
      });

      throw error;
    } finally {
      (db as IDBDatabase | null)?.close();
    }
  };
