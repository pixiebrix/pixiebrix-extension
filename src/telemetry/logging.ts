import { recordError } from "@/background/logging";
import { MessageContext, SerializedError } from "@/core";
import { serializeError } from "serialize-error";

function selectError(exc: unknown): SerializedError {
  if (exc instanceof Error) {
    return serializeError(exc);
  } else if (typeof exc === "object") {
    const obj = exc as Record<string, unknown>;
    if (obj.type === "unhandledrejection") {
      return serializeError({
        // @ts-ignore: OK given the type of reason on unhandledrejection
        message: obj.reason?.message ?? "Uncaught error in promise",
      });
    } else {
      return serializeError(obj);
    }
  } else {
    return serializeError(exc);
  }
}

export async function reportError(
  exc: unknown,
  context?: MessageContext
): Promise<void> {
  // Wrap in try/catch, otherwise will enter infinite loop on unhandledrejection when
  // messaging the background script
  try {
    await recordError(selectError(exc), context, null);
  } catch (exc) {
    console.error(`Another error occurred while reporting an error: ${exc}`);
  }
}
