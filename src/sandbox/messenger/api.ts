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

import injectIframe, { hiddenIframeStyle } from "@/utils/injectIframe";
import postMessage from "@/utils/postMessage";
import pMemoize from "p-memoize";
import { type JsonValue, type JsonObject } from "type-fest";

// Uses pMemoize to allow retries after a failure
const loadSandbox = pMemoize(async () => {
  const iframe = await injectIframe(
    chrome.runtime.getURL("sandbox.html"),
    hiddenIframeStyle
  );
  return iframe.contentWindow;
});

export default function initSandbox() {}

export async function ping() {
  return postMessage({
    channel: await loadSandbox(),
    type: "SANDBOX_PING",
  });
}

export type NunjucksRenderPayload = {
  template: string;
  context: JsonObject;
  autoescape: boolean;
};

export async function renderNunjucksTemplate(payload: NunjucksRenderPayload) {
  return postMessage({
    channel: await loadSandbox(),
    payload,
    type: "RENDER_NUNJUCKS",
  });
}

export type ApplyJqPayload = {
  input: JsonValue;
  filter: string;
};

export async function applyJq(payload: ApplyJqPayload) {
  return postMessage({
    channel: await loadSandbox(),
    payload,
    type: "APPLY_JQ",
  });
}
