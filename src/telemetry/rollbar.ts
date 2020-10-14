import Rollbar from "rollbar";

export function initRollbar(): void {
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
      transform: function (payload: Record<string, unknown>) {
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
