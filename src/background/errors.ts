import { liftBackground } from "@/background/protocol";
import Rollbar from "rollbar";

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

export const recordError = liftBackground(
  "RECORD_ERROR",
  (error: SerializedError, context: ErrorContext) => {
    try {
      // @ts-ignore: not sure how to distinguish between the class and the namespace in the rollbar file
      Rollbar.error(error.message, error);
    } catch (ex) {
      console.error(error.message, context);
    }
    return {};
  },
  { asyncResponse: false }
);
