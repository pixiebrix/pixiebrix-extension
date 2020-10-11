import {
  ErrorContext,
  SerializedError,
  recordError,
} from "@/background/errors";

function selectError(exc: unknown): SerializedError {
  if (exc instanceof Error) {
    return {
      message: exc.toString(),
      stack: exc.stack,
    };
  } else if (typeof exc === "object") {
    const obj = exc as Record<string, unknown>;
    if (obj && obj.stack && obj.message) {
      return exc as SerializedError;
    } else if (typeof exc === "string") {
      return { message: exc };
    } else if (obj.type === "unhandledrejection") {
      // @ts-ignore: OK given the type of reason on unhandledrejection
      return { message: obj.reason?.message ?? "Uncaught error in promise" };
    }
  } else {
    console.warn("reportError received unexpected error object", exc);
    return { message: `Unknown error of type ${typeof exc}` };
  }
}

export async function reportError(
  exc: unknown,
  context?: ErrorContext
): Promise<void> {
  // Wrap in try/catch, otherwise will enter infinite loop on unhandledrejection when
  // messaging the background script
  try {
    await recordError(selectError(exc), context ?? {});
  } catch (exc) {
    console.error(`Error reporting error to background script: ${exc}`);
  }
}
