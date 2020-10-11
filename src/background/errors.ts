import { liftBackground } from "@/background/protocol";
import Rollbar from "rollbar";
import { readStorage, setStorage } from "@/chrome";

const STORAGE_KEY = "ERROR_LOG";

// copied from redux-toolkit: https://redux-toolkit.js.org/api/createAsyncThunk#promise-lifecycle-actions
export interface SerializedError {
  name?: string;
  message?: string;
  code?: string;
  stack?: string;
}

export interface ErrorContext {
  extensionPointId?: string;
  blockId?: string;
  extensionId?: string;
  serviceId?: string;
  authId?: string;
}

export interface ErrorContextWithMetadata extends ErrorContext {
  uuid: string;
  timestamp: string;
}

export interface ErrorEntry {
  context: ErrorContextWithMetadata;
  error: SerializedError;
}

export async function saveError(
  error: SerializedError,
  context: ErrorContextWithMetadata
): Promise<void> {
  const current = JSON.parse(
    (await readStorage(STORAGE_KEY)) ?? "[]"
  ) as ErrorEntry[];
  const next = [{ error, context }, ...current];
  console.debug(`Stored error to log, current log size: ${next.length}`);
  await setStorage(STORAGE_KEY, JSON.stringify(next));
}

export async function getErrors(context?: ErrorContext): Promise<ErrorEntry[]> {
  const allErrors = JSON.parse(
    (await readStorage(STORAGE_KEY)) ?? "[]"
  ) as ErrorEntry[];
  return allErrors.filter((x) =>
    Object.entries(context ?? {}).every(
      ([key, value]) => x.context[key as keyof ErrorContext] === value
    )
  );
}

export const recordError = liftBackground(
  "RECORD_ERROR",
  async (error: SerializedError, context: ErrorContextWithMetadata) => {
    try {
      // @ts-ignore: not sure how to distinguish between the class and the namespace in the rollbar file
      Rollbar.error(error.message, error);
      await saveError(error, context);
    } catch (ex) {
      console.error(error.message, context);
    }
    return {};
  },
  { asyncResponse: false }
);
