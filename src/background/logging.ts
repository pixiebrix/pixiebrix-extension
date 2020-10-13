import { v4 as uuidv4 } from "uuid";
import { liftBackground } from "@/background/protocol";
import Rollbar from "rollbar";
import { readStorage, setStorage } from "@/chrome";
import { MessageContext, Logger as ILogger, SerializedError } from "@/core";
import { JsonObject } from "type-fest";
import { serializeError } from "serialize-error";
import debounce from "lodash/debounce";
import compact from "lodash/compact";

const STORAGE_KEY = "LOG";

type MessageLevel = "debug" | "info" | "warn" | "error" | "trace";

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

export async function getLog(
  context: MessageContext = {}
): Promise<LogEntry[]> {
  const allErrors = JSON.parse(
    (await readStorage(STORAGE_KEY)) ?? "[]"
  ) as LogEntry[];
  return allErrors.filter((entry) =>
    Object.entries(context ?? {}).every(
      ([key, value]) =>
        (entry.context ?? {})[key as keyof MessageContext] === value
    )
  );
}

function errorMessage(err: SerializedError): string {
  return typeof err === "object" ? err.message : String(err);
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
        context,
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
