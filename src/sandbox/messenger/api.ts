/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { type RegistryId } from "@/types/registryTypes";
import injectIframe, { hiddenIframeStyle } from "@/utils/injectIframe";
import postMessage from "@/utils/postMessage";
import pMemoize from "p-memoize";
import * as directApi from "@/sandbox/messenger/executor";
import { type JsonObject } from "type-fest";
import { getSettingsState } from "@/store/settings/settingsStorage";
import { once } from "lodash";
import { isMV3 } from "@/mv3/api";

// Uses pMemoize to allow retries after a failure
const loadSandbox = pMemoize(async () => {
  const iframe = await injectIframe(
    chrome.runtime.getURL("sandbox.html"),
    hiddenIframeStyle,
  );
  return iframe.contentWindow;
});

export default loadSandbox;

const isSandboxed = once(async (): Promise<boolean> => {
  if (isMV3()) {
    return true;
  }

  const { sandboxedCode } = await getSettingsState();
  return Boolean(sandboxedCode);
});

export async function ping() {
  return postMessage({
    recipient: await loadSandbox(),
    type: "SANDBOX_PING",
  });
}

export type TemplateRenderPayload = {
  template: string;
  context: JsonObject;
  autoescape: boolean;
};

export async function renderNunjucksTemplate(payload: TemplateRenderPayload) {
  return (await isSandboxed())
    ? postMessage({
        recipient: await loadSandbox(),
        payload,
        type: "RENDER_NUNJUCKS",
      })
    : directApi.renderNunjucksTemplate(payload);
}

export async function renderHandlebarsTemplate(payload: TemplateRenderPayload) {
  return (await isSandboxed())
    ? postMessage({
        recipient: await loadSandbox(),
        payload,
        type: "RENDER_HANDLEBARS",
      })
    : directApi.renderHandlebarsTemplate(payload);
}

export type JavaScriptPayload = {
  code: string;
  data?: JsonObject;
  blockId: RegistryId;
};

export async function runUserJs(payload: JavaScriptPayload) {
  return postMessage({
    recipient: await loadSandbox(),
    payload,
    type: "RUN_USER_JS",
  });
}
