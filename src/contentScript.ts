import {
  SEARCH_WINDOW,
  DETECT_FRAMEWORK_VERSIONS,
  CONNECT_EXTENSION,
  HISTORY_STATE_UPDATED,
} from "./messaging/constants";
import { withSearchWindow, withDetectFrameworkVersions } from "@/common";
import { handleNavigate } from "@/lifecycle";
import { reportError } from "@/telemetry/rollbar";
import { Message } from "@/core";
import "notifyjs-browser";
import "jquery.initialize";
import "@/telemetry/mixpanel";

const _watchedReaders = {};

document.addEventListener(CONNECT_EXTENSION, function (e) {
  // eslint-disable-next-line require-await
  handleNavigate(_watchedReaders);
});

// Don't need because we're getting the navigation events
// window.addEventListener("popstate", function (event) {
//   console.debug("popstate", event.state);
// });

window.addEventListener("error", function (e) {
  // eslint-disable-next-line require-await
  reportError(e);
  return false;
});

window.addEventListener("unhandledrejection", function (e) {
  // eslint-disable-next-line require-await
  reportError(e);
});

// REFACTOR: figure out how to not duplicate these here. Can't reuse the make methods since they'll
// conflict with the other ones that are already made unless we make it a singleton factory
const MESSAGE_HANDLERS: {
  [key: string]: (message: Message) => Promise<unknown>;
} = {
  [SEARCH_WINDOW]: withSearchWindow,
  [DETECT_FRAMEWORK_VERSIONS]: withDetectFrameworkVersions,
};

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  const handler = MESSAGE_HANDLERS[message.type];
  if (handler) {
    console.debug(message.type, { message, sender });
    handler(message).then(sendResponse);
    return true;
  } else if (message.type === HISTORY_STATE_UPDATED) {
    // eslint-disable-next-line require-await
    handleNavigate(_watchedReaders);
    return false;
  } else {
    console.warn("Content Script ignoring message", { message, sender });
    return false;
  }
});

// https://stackoverflow.com/questions/9515704/insert-code-into-the-page-context-using-a-content-script/9517879#9517879
// https://stackoverflow.com/questions/9602022/chrome-extension-retrieving-global-variable-from-webpage
const script = document.createElement("script");
script.src = chrome.extension.getURL("script.js");
(document.head || document.documentElement).appendChild(script);
script.onload = function () {
  script.remove();
};
