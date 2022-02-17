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

import { uuidv4 } from "@/types/helpers";
import { getRollbar } from "@/telemetry/rollbar";
import { MessageContext, SerializedError } from "@/core";
import { Except, JsonObject } from "type-fest";
import { deserializeError } from "serialize-error";
import { DBSchema, openDB } from "idb/with-async-ittr";
import { isEmpty, sortBy } from "lodash";
import { allowsTrack } from "@/telemetry/dnt";
import { ManualStorageKey, readStorage, setStorage } from "@/chrome";
import {
  getErrorMessage,
  getRootCause,
  hasBusinessRootCause,
  hasCancelRootCause,
  IGNORED_ERROR_PATTERNS,
  isAxiosError,
  isContextError,
} from "@/errors";
import { expectContext, forbidContext } from "@/utils/expectContext";
import { isAppRequest, selectAbsoluteUrl } from "@/services/requestErrorUtils";
import { readAuthData } from "@/auth/token";
import { UnknownObject } from "@/types";
import { isObject, matchesAnyPattern } from "@/utils";

const STORAGE_KEY = "LOG";
const ENTRY_OBJECT_STORE = "entries";
const DB_VERSION_NUMBER = 3;

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

type IndexKey = keyof Except<MessageContext, "deploymentId" | "label">;
const indexKeys: IndexKey[] = [
  "extensionId",
  "blueprintId",
  "blockId",
  "extensionPointId",
  "serviceId",
  "authId",
];

async function getDB() {
  return openDB<LogDB>(STORAGE_KEY, DB_VERSION_NUMBER, {
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
  });
}

export async function appendEntry(entry: LogEntry): Promise<void> {
  const db = await getDB();
  await db.add(ENTRY_OBJECT_STORE, entry);
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

export async function clearLogs(): Promise<void> {
  const db = await getDB();

  const tx = db.transaction(ENTRY_OBJECT_STORE, "readwrite");
  await tx.store.clear();
}

export async function clearLog(context: MessageContext = {}): Promise<void> {
  const db = await getDB();

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
}

export async function getLog(
  context: MessageContext = {}
): Promise<LogEntry[]> {
  const db = await getDB();
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

  // We use the index to do an initial filter on the IndexedDB level, and then makeMatchEntry to apply the full filter in JS.
  // eslint-disable-next-line security/detect-object-injection -- indexKeys is compile-time constant
  const entries = await objectStore.index(indexKey).getAll(context[indexKey]);

  const match = makeMatchEntry(context);
  const matches = entries.filter((entry) => match(entry));

  // Use both reverse and sortBy because we want insertion order if there's a tie in the timestamp
  return sortBy(matches.reverse(), (x) => -Number.parseInt(x.timestamp, 10));
}

/**
 * Unroll/flatten the context of nested `ContextErrors`
 * @see SerializedError
 */
function flattenContext(
  error: SerializedError,
  context: MessageContext
): MessageContext {
  if (isContextError(error)) {
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

/**
 * Select extra error context for:
 * - Extension version, so we don't have to maintain a separate mapping of commit SHAs to versions for reporting
 * - Requests to PixieBrix API to detect network problems client side
 * - Any service request if enterprise has enabled `enterprise-telemetry`
 */
async function selectExtraContext(
  error: SerializedError
): Promise<UnknownObject> {
  const { version: extensionVersion } = browser.runtime.getManifest();

  if (!isObject(error)) {
    return { extensionVersion };
  }

  const cause = getRootCause(error);

  // Handle base classes of ClientRequestError
  if ("error" in cause && isAxiosError(cause.error)) {
    const { flags = [] } = await readAuthData();
    if (
      (await isAppRequest(cause.error)) ||
      flags.includes("enterprise-telemetry")
    ) {
      return {
        extensionVersion,
        url: selectAbsoluteUrl(cause.error.config),
      };
    }
  }

  return { extensionVersion };
}

/**
 * True if recordError already logged a warning that DNT mode is on
 */
let loggedDNT = false;

export async function recordError(
  error: SerializedError,
  context: MessageContext,
  data: JsonObject | undefined
): Promise<void> {
  forbidContext(
    "contentScript",
    "contentScript does not have CSP access to Rollbar"
  );

  try {
    const message = getErrorMessage(error);

    // For noisy errors, don't record/submit telemetry unless the error caused prevented an extension point
    // from being installed or an extension to fail. (In that case, we'd have some context about the error)
    if (
      isEmpty(context) &&
      matchesAnyPattern(message, IGNORED_ERROR_PATTERNS)
    ) {
      return;
    }

    const flatContext = flattenContext(error, context);

    if (await allowsTrack()) {
      // Deserialize the error into an Error object before passing it to Rollbar so rollbar treats it as the error.
      // (It treats POJO as the custom data)
      // See https://docs.rollbar.com/docs/rollbarjs-configuration-reference#rollbarlog

      // WARNING: the prototype chain is lost during deserialization, so make sure any predicates you call here
      // to determine log level also handle serialized/deserialized errors.
      // See https://github.com/sindresorhus/serialize-error/issues/48
      const errorObj = deserializeError(error);

      if (hasCancelRootCause(error)) {
        // NOP - no reason to send to Rollbar
      } else if (hasBusinessRootCause(error)) {
        // Send at debug level so it doesn't trigger devops notifications
        const rollbar = await getRollbar();
        const details = await selectExtraContext(error);
        rollbar.debug(message, errorObj, { ...flatContext, ...details });
      } else {
        const rollbar = await getRollbar();
        const details = await selectExtraContext(error);
        rollbar.error(message, errorObj, { ...flatContext, ...details });
      }
    } else if (!loggedDNT) {
      console.warn("Rollbar telemetry is disabled because DNT is turned on");
      loggedDNT = true;
    }

    await appendEntry({
      uuid: uuidv4(),
      timestamp: Date.now().toString(),
      level: "error",
      context: flatContext,
      message,
      error,
      data,
    });
  } catch {
    console.error("An error occurred while recording another error", {
      error,
      context,
    });
  }
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

const LOG_CONFIG_STORAGE_KEY = "LOG_OPTIONS" as ManualStorageKey;
let _config: LoggingConfig = null;

export async function getLoggingConfig(): Promise<LoggingConfig> {
  expectContext("background");

  if (_config != null) {
    return _config;
  }

  return readStorage(LOG_CONFIG_STORAGE_KEY, {
    logValues: false,
  });
}

export async function setLoggingConfig(config: LoggingConfig): Promise<void> {
  expectContext("background");

  await setStorage(LOG_CONFIG_STORAGE_KEY, config);
  _config = config;
}
