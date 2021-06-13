/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { v4 as uuidv4 } from "uuid";
import { liftBackground } from "@/background/protocol";
import Rollbar from "rollbar";
import { MessageContext, Logger as ILogger, SerializedError } from "@/core";
import { JsonObject } from "type-fest";
import { serializeError } from "serialize-error";
import { DBSchema, openDB } from "idb/with-async-ittr";
import { reverse, sortBy } from "lodash";
import { _getDNT } from "@/background/telemetry";
import { isBackgroundPage, isContentScript } from "webext-detect-page";
import { readStorage, setStorage } from "@/chrome";
import {
  hasBusinessRootCause,
  hasCancelRootCause,
  isConnectionError,
} from "@/errors";
import { showConnectionLost } from "@/contentScript/connection";

const STORAGE_KEY = "LOG";
const ENTRY_OBJECT_STORE = "entries";

export type MessageLevel = "trace" | "debug" | "info" | "warn" | "error";

export const LOG_LEVELS: { [key in MessageLevel]: number } = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

export interface LogEntry {
  uuid: string;
  timestamp: string;
  message: string;
  level: MessageLevel;
  context: MessageContext;
  data?: JsonObject;
  error?: SerializedError;
}

interface LogDB extends DBSchema {
  [ENTRY_OBJECT_STORE]: {
    value: LogEntry;
    key: string;
    indexes: {
      extensionPointId: string;
      extensionId: string;
      blockId: string;
      serviceId: string;
      authId: string;
      context: [string, string, string, string, string];
    };
  };
}

const indexKeys = [
  "extensionPointId",
  "extensionId",
  "blockId",
  "serviceId",
  "authId",
];

async function getDB() {
  return await openDB<LogDB>(STORAGE_KEY, 1, {
    upgrade(db) {
      // Create a store of objects
      const store = db.createObjectStore(ENTRY_OBJECT_STORE, {
        keyPath: "uuid",
      });
      store.createIndex("extensionPointId", "context.extensionPointId", {
        unique: false,
      });
      store.createIndex("extensionId", "context.extensionId", {
        unique: false,
      });
      store.createIndex("blockId", "context.blockId", { unique: false });
      store.createIndex("serviceId", "context.serviceId", { unique: false });
      store.createIndex("authId", "context.authId", { unique: false });
      store.createIndex(
        "context",
        indexKeys.map((x) => `context.${x}`),
        { unique: false }
      );
    },
  });
}

export async function appendEntry(entry: LogEntry): Promise<void> {
  const db = await getDB();
  await db.add("entries", entry);
}

function makeMatchEntry(context: MessageContext): (entry: LogEntry) => boolean {
  return (entry: LogEntry) =>
    Object.entries(context ?? {}).every(
      ([key, value]) =>
        (entry.context ?? {})[key as keyof MessageContext] === value
    );
}

export async function clearLogs(): Promise<void> {
  const db = await getDB();

  const tx = db.transaction(ENTRY_OBJECT_STORE, "readwrite");
  await tx.store.clear();
}

export async function clearLog(context: MessageContext = {}): Promise<void> {
  const db = await getDB();

  const tx = db.transaction(ENTRY_OBJECT_STORE, "readwrite");
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
  const tx = db.transaction(ENTRY_OBJECT_STORE, "readonly");
  const match = makeMatchEntry(context);

  const entries = [];
  for await (const cursor of tx.store) {
    if (match(cursor.value)) {
      entries.push(cursor.value);
    }
  }
  return sortBy(reverse(entries), (x) => -Number.parseInt(x.timestamp, 10));
}

function errorMessage(err: SerializedError): string {
  return typeof err === "object" ? err.message : String(err);
}

function buildContext(
  error: SerializedError,
  context: MessageContext
): MessageContext {
  if (typeof error === "object" && error && error.name === "ContextError") {
    const currentContext =
      typeof error.context === "object" ? error.context : {};
    const innerContext = buildContext(error.cause as SerializedError, context);
    // prefer the inner context
    return { ...context, ...innerContext, ...currentContext };
  }
  return context;
}

// Ensure this whole function’s content is wrapped in try/catch to avoid uncaught error loops
export const recordError = liftBackground(
  "RECORD_ERROR",
  async (
    error: SerializedError,
    context: MessageContext,
    data: JsonObject | undefined
  ): Promise<void> => {
    try {
      console.error(errorMessage(error), error);

      if (!(await _getDNT())) {
        if (hasCancelRootCause(error)) {
          // NOP - no reason to send to Rollbar
        } else if (hasBusinessRootCause(error)) {
          (Rollbar as any).debug(errorMessage(error), error);
        } else {
          (Rollbar as any).error(errorMessage(error), error);
        }
      }

      await appendEntry({
        uuid: uuidv4(),
        timestamp: Date.now().toString(),
        level: "error",
        context: buildContext(error, context),
        message: errorMessage(error),
        error,
        data,
      });
    } catch (ex) {
      console.error("An error occurred while recording another error", {
        error,
        context,
      });
    }
  },
  { asyncResponse: false }
);

export const recordLog = liftBackground(
  "RECORD_LOG",
  async (
    context: MessageContext,
    level: MessageLevel,
    message: string,
    data: JsonObject
  ): Promise<void> => {
    await appendEntry({
      uuid: uuidv4(),
      timestamp: Date.now().toString(),
      level,
      message,
      data,
      context: context ?? {},
    });
  },
  { asyncResponse: false }
);

export class BackgroundLogger implements ILogger {
  readonly context: MessageContext;

  constructor(context: MessageContext) {
    this.context = context;
  }

  childLogger(context: MessageContext): ILogger {
    return new BackgroundLogger({ ...this.context, ...context });
  }

  async trace(message: string, data: JsonObject): Promise<void> {
    console.trace(message, { data, context: this.context });
    await recordLog(this.context, "trace", message, data);
  }

  async debug(message: string, data: JsonObject): Promise<void> {
    console.debug(message, { data, context: this.context });
    await recordLog(this.context, "debug", message, data);
  }

  async log(message: string, data: JsonObject): Promise<void> {
    console.log(message, { data, context: this.context });
    await recordLog(this.context, "info", message, data);
  }

  async info(message: string, data: JsonObject): Promise<void> {
    console.info(message, { data, context: this.context });
    await recordLog(this.context, "info", message, data);
  }

  async warn(message: string, data: JsonObject): Promise<void> {
    console.warn(message, { data, context: this.context });
    await recordLog(this.context, "warn", message, data);
  }

  async error(error: unknown, data: JsonObject): Promise<void> {
    console.error(`An error occurred: ${error}`, {
      error,
      context: this.context,
      data,
    });

    if (isConnectionError(error) && isContentScript()) {
      showConnectionLost();
    }

    await recordError(serializeError(error), this.context, data);
  }
}

export type LoggingConfig = {
  logValues: boolean;
};

const LOG_CONFIG_STORAGE_KEY = "LOG_OPTIONS";
let _config: LoggingConfig = null;

export async function _getLoggingConfig(): Promise<LoggingConfig> {
  if (!isBackgroundPage()) {
    throw new Error(
      "_getLoggingConfig should only be called from the background page"
    );
  }
  if (_config != null) {
    return _config;
  }
  const raw = await readStorage<string>(LOG_CONFIG_STORAGE_KEY);
  _config = raw ? JSON.parse(raw) : {};
  return _config;
}

export async function _setLoggingConfig(config: LoggingConfig): Promise<void> {
  if (!isBackgroundPage()) {
    throw new Error(
      "_setLoggingConfig should only be called from the background page"
    );
  }
  await setStorage(LOG_CONFIG_STORAGE_KEY, JSON.stringify(config));
  _config = config;
}

export const getLoggingConfig = liftBackground(
  "GET_LOGGING_CONFIG",
  async () => {
    return await _getLoggingConfig();
  }
);

export const setLoggingConfig = liftBackground(
  "SET_LOGGING_CONFIG",
  async (config: LoggingConfig) => {
    return await _setLoggingConfig(config);
  }
);
