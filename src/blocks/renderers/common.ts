import { reportError } from "@/telemetry/logging";
import { ErrorContext } from "@/background/errors";

/** An error boundary for renderers */
export async function errorBoundary(
  renderPromise: Promise<string>,
  errorContext: ErrorContext
): Promise<string> {
  try {
    return await renderPromise;
  } catch (exc) {
    // Intentionally don't block on error telemetry
    // eslint-disable-next-line require-await
    reportError(exc, errorContext);
    return `<div>An error occurred: ${exc.toString()}</div>`;
  }
}
