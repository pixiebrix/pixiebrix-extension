import { getErrorMessage } from "@/errors/errorHelpers";
import { MessageContext } from "@/types/loggerTypes";

export let logValues = true;

// A mock that doesn't call the background page to report the error
export function reportError(error: unknown, context?: MessageContext): void {
  console.error("Report error: %s", getErrorMessage(error), {
    error,
    context,
  });

  throw new Error(
    `Unexpected call to reportError during test: ${getErrorMessage(error)}`
  );
}
export async function getLoggingConfig(): Promise<unknown> {
  return {
    logValues,
  };
}
