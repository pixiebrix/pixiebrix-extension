import { Logger } from "@/core";

/** An error boundary for renderers */
export async function errorBoundary(
  renderPromise: Promise<string>,
  logger: Logger
): Promise<string> {
  try {
    return await renderPromise;
  } catch (exc) {
    logger.error(exc);
    return `<div>An error occurred: ${exc.toString()}</div>`;
  }
}
