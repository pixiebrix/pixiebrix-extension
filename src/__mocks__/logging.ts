import { MessageContext } from "@/core";
import { getErrorMessage } from "@/errors";

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
