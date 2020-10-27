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
import { readStorage, setStorage } from "@/chrome";
import { MessageContext, Logger as ILogger, SerializedError } from "@/core";
import { JsonObject } from "type-fest";
import { serializeError } from "serialize-error";
import debounce from "lodash/debounce";
import compact from "lodash/compact";
import negate from "lodash/negate";

const STORAGE_KEY = "LOG";

export type MessageLevel = "trace" | "debug" | "info" | "warn" | "error";

export const LOG_LEVELS: { [key in MessageLevel]: number } = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

const LOG_APPEND_DEBOUNCE_MILLIS = 150;

export interface LogEntry {
  uuid: string;
  timestamp: string;
  message: string;
  level: MessageLevel;
  context: MessageContext;
  data?: JsonObject;
  error?: SerializedError;
}

const _logQueue: LogEntry[] = [];

async function _append() {
  const current = JSON.parse(
    (await readStorage(STORAGE_KEY)) ?? "[]"
  ) as LogEntry[];
  await setStorage(
    STORAGE_KEY,
    JSON.stringify(compact([..._logQueue, ...current]))
  );
  _logQueue.length = 0;
}

const debouncedAppend = debounce(_append, LOG_APPEND_DEBOUNCE_MILLIS);

export async function appendEntry(entry: LogEntry): Promise<void> {
  _logQueue.push(entry);
  debouncedAppend();
}

function makeMatchEntry(context: MessageContext): (entry: LogEntry) => boolean {
  return (entry: LogEntry) =>
    Object.entries(context ?? {}).every(
      ([key, value]) =>
        (entry.context ?? {})[key as keyof MessageContext] === value
    );
}

export async function clearLog(context: MessageContext = {}): Promise<void> {
  const allErrors = JSON.parse(
    (await readStorage<string>(STORAGE_KEY)) ?? "[]"
  ) as LogEntry[];

  await setStorage(
    STORAGE_KEY,
    JSON.stringify(allErrors.filter(negate(makeMatchEntry(context))))
  );
}

export async function getLog(
  context: MessageContext = {}
): Promise<LogEntry[]> {
  const allErrors = JSON.parse(
    (await readStorage<string>(STORAGE_KEY)) ?? "[]"
  ) as LogEntry[];
  return allErrors.filter(makeMatchEntry(context));
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

export const recordError = liftBackground(
  "RECORD_ERROR",
  async (
    error: SerializedError,
    context: MessageContext,
    data: JsonObject | undefined
  ): Promise<void> => {
    try {
      (Rollbar as any).error(errorMessage(error), error);
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
  private readonly context: MessageContext;

  constructor(context: MessageContext) {
    this.context = context;
  }

  childLogger(context: MessageContext): ILogger {
    return new BackgroundLogger({ ...this.context, ...context });
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
    await recordError(serializeError(error), this.context, data);
  }
}
