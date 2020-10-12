import "regenerator-runtime/runtime";
import "core-js/stable";
import { initRollbar } from "@/telemetry/rollbar";

// init first so we get error reporting on the other initialization
initRollbar();

import "./background/external";
import "./background/requests";
import "./background/locator";
import "./background/logging";

import initGoogle from "@/contrib/google/background";
import initFrames from "@/background/iframes";
import initNavigation from "@/background/navigation";

initNavigation();
initGoogle();
initFrames();
