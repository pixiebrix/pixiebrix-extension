import pDefer from "p-defer";
import { deleteDB } from "idb";
import { getErrorMessage } from "@/errors/errorHelpers";

// IDB Connection Error message strings
const CONNECTION_ERRORS = ["Error Opening IndexedDB"] as const;

// IDB Quota Error message strings
const QUOTA_ERRORS = [
  "Encountered full disk while opening backing store for indexedDB.open",
  "IndexedDB Full",
] as const;

/**
 * Delete an IndexedDB database.
 * @param databaseName the database name
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
