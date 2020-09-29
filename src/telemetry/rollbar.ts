import Rollbar from "rollbar";
import { messageBackgroundScript } from "@/chrome";
import { CONTENT_SCRIPT_ERROR } from "@/messaging/constants";

export function initRollbar() {
  if (
    process.env.ROLLBAR_ACCESS_TOKEN &&
    process.env.ROLLBAR_ACCESS_TOKEN !== "undefined"
  ) {
    Rollbar.init({
      accessToken: process.env.ROLLBAR_ACCESS_TOKEN,
      captureUncaught: true,
      captureUnhandledRejections: true,
      payload: {
        environment: process.env.NODE_ENV,
      },
      transform: function (payload: object) {
        // @ts-ignore: copied this example from Rollbar's documentation, so should presumably always be available
        const trace = payload.body.trace;
        const locRegex = /^(chrome-extension):\/\/(.*?)\/(.*)/;
        if (trace && trace.frames) {
          for (let i = 0; i < trace.frames.length; i++) {
            const filename = trace.frames[i].filename;
            if (filename) {
              const m = filename.match(locRegex);
              // Be sure that the minified_url when uploading includes 'dynamichost'
              trace.frames[i].filename = m[1] + "://dynamichost/" + m[3];
            }
          }
        }
      },
    });
  } else {
    console.debug("Rollbar not configured");
  }
}

export interface ErrorContext {
  extensionPointId?: string;
  blockId?: string;
  extensionId?: string;
  serviceId?: string;
  authId?: string;
}

function selectError(exc: any) {
  if (exc instanceof Error) {
    return {
      message: exc.toString(),
      stack: exc.stack,
    };
  } else if (exc && exc.stack && exc.message) {
    return exc;
  } else if (typeof exc === "string") {
    return { message: exc };
  } else if (exc.type === "unhandledrejection") {
    return { message: exc.reason?.message ?? "Uncaught error in promise" };
  } else {
    console.warn("reportError received unexpected error object", exc);
    return { message: `Unknown error of type ${typeof exc}` };
  }
}

export async function reportError(exc: unknown, context?: ErrorContext) {
  console.error("reportError", { exc });
  // Wrap in try/catch, otherwise will enter infinite loop on unhandledrejection
  try {
    await messageBackgroundScript(CONTENT_SCRIPT_ERROR, {
      error: selectError(exc),
      context: context ?? {},
    });
  } catch (exc) {
    console.error(`Error reporting error to background script: ${exc}`);
  }
}
