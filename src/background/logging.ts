import { v4 as uuidv4 } from "uuid";
import { liftBackground } from "@/background/protocol";
import Rollbar from "rollbar";
import { readStorage, setStorage } from "@/chrome";
import { MessageContext, Logger as ILogger, SerializedError } from "@/core";
import { JsonObject } from "type-fest";
import { serializeError } from "serialize-error";

const STORAGE_KEY = "LOG";

type MessageLevel = "debug" | "info" | "warn" | "error" | "trace";

export interface LogEntry {
  uuid: string;
  timestamp: string;
  level: MessageLevel;
  context: MessageContext;
  data?: JsonObject;
  error?: SerializedError;
}

export async function appendEntry(entry: LogEntry): Promise<void> {
  const current = JSON.parse(
    (await readStorage(STORAGE_KEY)) ?? "[]"
  ) as LogEntry[];
  await setStorage(STORAGE_KEY, JSON.stringify([entry, ...current]));
}

export async function getLog(context?: MessageContext): Promise<LogEntry[]> {
  const allErrors = JSON.parse(
    (await readStorage(STORAGE_KEY)) ?? "[]"
  ) as LogEntry[];
  return allErrors.filter((x) =>
    Object.entries(context ?? {}).every(
      ([key, value]) => x.context[key as keyof MessageContext] === value
    )
  );
}

export const recordError = liftBackground(
  "RECORD_ERROR",
  async (
    error: SerializedError,
    context: MessageContext,
    data: JsonObject | undefined
  ): Promise<void> => {
    try {
      // @ts-ignore: not sure how to distinguish between the class and the namespace in the rollbar file
      Rollbar.error(error.message, error);
      await appendEntry({
        uuid: uuidv4(),
        timestamp: Date.now().toString(),
        level: "error",
        context,
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
