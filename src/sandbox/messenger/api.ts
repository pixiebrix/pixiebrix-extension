/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
import pMemoize, { pMemoizeClear } from "p-memoize";
import { type JsonObject } from "type-fest";
import { memoizeUntilSettled } from "@/utils/promiseUtils";

const SANDBOX_SHADOW_ROOT_ID = "pixiebrix-sandbox";

const loadSandbox = pMemoize(async () =>
  injectIframe(
    chrome.runtime.getURL("sandbox.html"),
    hiddenIframeStyle,
    SANDBOX_SHADOW_ROOT_ID,
  ),
);

const getSandbox = memoizeUntilSettled(async () => {
  let sandbox = await loadSandbox();
  const isSandboxWrapperInDom = document.querySelector(
    `#${SANDBOX_SHADOW_ROOT_ID}`,
  );

  if (isSandboxWrapperInDom) {
    await postMessage({
      recipient: sandbox.contentWindow,
      payload: "ping",
      type: "SANDBOX_PING",
    });
  } else {
    console.warn("Sandbox iframe was removed from the DOM. Reinjecting...");
    pMemoizeClear(loadSandbox);
    sandbox = await loadSandbox();
  }

  return sandbox.contentWindow;
});

export type TemplateRenderPayload = {
  template: string;
  context: JsonObject;
  autoescape: boolean;
};

export type TemplateValidatePayload = string;

export async function renderNunjucksTemplate(
  payload: TemplateRenderPayload,
): Promise<string> {
  return postMessage({
    recipient: await getSandbox(),
    payload,
    type: "RENDER_NUNJUCKS",
  });
}

export async function validateNunjucksTemplate(
  payload: TemplateValidatePayload,
): Promise<void> {
  return postMessage({
    recipient: await getSandbox(),
    payload,
    type: "VALIDATE_NUNJUCKS",
  });
}

export async function renderHandlebarsTemplate(
  payload: TemplateRenderPayload,
): Promise<string> {
  return postMessage({
    recipient: await getSandbox(),
    payload,
    type: "RENDER_HANDLEBARS",
  });
}

export type JavaScriptPayload = {
  code: string;
  data?: JsonObject;
};

export async function runUserJs(payload: JavaScriptPayload) {
  return postMessage({
    recipient: await getSandbox(),
    payload,
    type: "RUN_USER_JS",
  });
}
