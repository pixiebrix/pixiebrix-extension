import { CONNECT_EXTENSION } from "./messaging/constants";
import { handleNavigate } from "@/lifecycle";
import { reportError } from "@/telemetry/logging";
import "@/contentScript/navigation";
import "@/contentScript/script";
import "notifyjs-browser";
import "jquery.initialize";
import "@/telemetry/mixpanel";
import "@/contrib";

const _watchedReaders = {};

document.addEventListener(CONNECT_EXTENSION, function () {
  // eslint-disable-next-line require-await
  handleNavigate(_watchedReaders);
});

window.addEventListener("error", function (e) {
  // eslint-disable-next-line require-await
  reportError(e);
  return false;
});

window.addEventListener("unhandledrejection", function (e) {
  // eslint-disable-next-line require-await
  reportError(e);
});

// https://stackoverflow.com/questions/9515704/insert-code-into-the-page-context-using-a-content-script/9517879#9517879
// https://stackoverflow.com/questions/9602022/chrome-extension-retrieving-global-variable-from-webpage
const script = document.createElement("script");
script.src = chrome.extension.getURL("script.js");
(document.head || document.documentElement).appendChild(script);
script.onload = function () {
  script.remove();
};
