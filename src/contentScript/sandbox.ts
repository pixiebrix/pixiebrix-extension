/*
 * Copyright (C) 2022 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { once } from "lodash";

const hiddenIframeStyle = {
  position: "absolute",
  bottom: "105%",
  right: "105%",
  visibility: "hidden",
};

function onMessage(event: MessageEvent): void {
  console.log("SANDBOX received", event);
}

const getSandbox = once(() => {
  const iframe = document.createElement("iframe");
  iframe.src = chrome.runtime.getURL("sandbox.html");
  window.addEventListener("message", onMessage);
  Object.assign(iframe.style, hiddenIframeStyle);
  return iframe;
});

export default function initSandbox() {
  const sandbox = getSandbox();
  document.body.append(sandbox);
  setTimeout(() => {
    console.log("SANDBOX pinging");
    // The origin must be "*" probably because it's reported as "null" to the outside world
    sandbox.contentWindow.postMessage("ping", "*");
  }, 1000);
}
