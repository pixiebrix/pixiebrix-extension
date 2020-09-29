import "regenerator-runtime/runtime";
import "core-js/stable";
import { createSendScriptMessage } from "./messaging/chrome";
import {
  DETECT_FRAMEWORK_VERSIONS,
  READ_WINDOW,
  SEARCH_WINDOW,
} from "./messaging/constants";

export const withReadWindow = createSendScriptMessage(READ_WINDOW);
export const withSearchWindow = createSendScriptMessage(SEARCH_WINDOW);
export const withDetectFrameworkVersions = createSendScriptMessage(
  DETECT_FRAMEWORK_VERSIONS
);
