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

/** @file It doesn't actually use the Messenger but this file tries to replicate the pattern */

import postMessage from "@/utils/postMessage";
import { once } from "lodash";
import { JsonObject } from "type-fest";

const hiddenIframeStyle = {
  position: "absolute",
  bottom: "105%",
  right: "105%",
  visibility: "hidden",
};

const getSandbox = once(() => {
  const iframe = document.createElement("iframe");
  iframe.src = chrome.runtime.getURL("sandbox.html");
  Object.assign(iframe.style, hiddenIframeStyle);
  return iframe;
});

export default function createSandbox() {
  const sandbox = getSandbox();
  document.body.append(sandbox);
  setTimeout(async () => {
    console.log("SANDBOX: sending PING");
    console.log("SANDBOX: received PING response:", await ping());
  }, 1000);
}

export async function ping() {
  return postMessage({
    channel: getSandbox().contentWindow,
    id: "SANDBOX_PING",
  });
}

export type NunjucksRenderPayload = {
  template: string;
  context: JsonObject;
  autoescape: boolean;
};

export async function renderNunjucksTemplate(payload: NunjucksRenderPayload) {
  return postMessage({
    channel: getSandbox().contentWindow,
    payload,
    id: "RENDER_NUNJUCKS",
  });
}

export type ApplyJqPayload = {
  input: any;
  filter: any;
};

export async function executeJq(payload: ApplyJqPayload) {
  return postMessage({
    channel: getSandbox().contentWindow,
    payload,
    id: "APPLY_JQ",
  });
}
