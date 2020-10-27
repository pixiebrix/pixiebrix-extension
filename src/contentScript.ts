/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { CONNECT_EXTENSION } from "./messaging/constants";
import { handleNavigate } from "@/contentScript/lifecycle";
import { reportError } from "@/telemetry/logging";
import "@/contentScript/script";
import "notifyjs-browser";
import "jquery.initialize";
import "@/telemetry/mixpanel";

// Import for the side effect of registering js defined blocks
import "@/blocks";
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
