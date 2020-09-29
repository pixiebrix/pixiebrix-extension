import "regenerator-runtime/runtime";
import "core-js/stable";
import { initRollbar } from "@/telemetry/rollbar";
import initWebsiteProtocol from "@/background/websiteProtocol";
import initGoogle from "@/background/google";
import initFrames from "@/background/iframes";
import initExtensionProtocol from "@/background/extensionProtocol";
import initNavigation from "@/background/navigation";

// init first so we get error reporting on the other initialization
initRollbar();

initExtensionProtocol();
initNavigation();
initGoogle();
initWebsiteProtocol();
initFrames();
