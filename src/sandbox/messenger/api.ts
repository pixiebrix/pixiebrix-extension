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

import injectIframe, {
  hiddenIframeStyle,
  IframeInjectionError,
} from "@/utils/injectIframe";
import postMessage, {
  type Payload,
  SandboxTimeoutError,
} from "@/sandbox/postMessage";
import pMemoize, { pMemoizeClear } from "p-memoize";
import { memoizeUntilSettled } from "@/utils/promiseUtils";
import pRetry from "p-retry";
import { type JsonObject } from "type-fest";
import { TimeoutError } from "p-timeout";
import { isSpecificError } from "@/errors/errorHelpers";
import { sendSandboxMessage } from "@/tinyPages/offscreenDocumentController";

const SANDBOX_SHADOW_ROOT_ID = "pixiebrix-sandbox";
const MAX_RETRIES = 3;

const loadSandbox = pMemoize(async () => {
  try {
    return await injectIframe(
      chrome.runtime.getURL("sandbox.html"),
      hiddenIframeStyle,
      SANDBOX_SHADOW_ROOT_ID,
    );
  } catch (error) {
    if (isSpecificError(error, TimeoutError)) {
      // Implicitly retry sandbox injection by removing the iframe if the load timeout occurs
      const sandboxWrapper = document.querySelector(
        `#${SANDBOX_SHADOW_ROOT_ID}`,
      );
      if (sandboxWrapper) {
        sandboxWrapper.remove();
      }
    }

    throw error;
  }
});

const getSandbox = memoizeUntilSettled(async () => {
  const sandbox = await loadSandbox();
  const sandboxWrapper = document.querySelector(`#${SANDBOX_SHADOW_ROOT_ID}`);

  if (!sandboxWrapper) {
    pMemoizeClear(loadSandbox);
    throw new IframeInjectionError("Sandbox wrapper was removed from the DOM.");
  }

  try {
    await postMessage({
      recipient: sandbox.contentWindow,
      payload: "ping",
      type: "SANDBOX_PING",
    });
  } catch (error) {
    if (
      isSpecificError(error, TimeoutError) ||
      isSpecificError(error, SandboxTimeoutError)
    ) {
      // It's possible that the sandbox has errored and is no longer responding to messages.
      // In this case, we should remove the sandbox to retry injecting a new one for future
      // messages.
      sandboxWrapper.remove();
      pMemoizeClear(loadSandbox);
      throw error;
    }

    throw error;
  }

  return sandbox.contentWindow;
});

async function postSandboxMessage<TReturn extends Payload = Payload>({
  type,
  payload,
}: {
  type: string;
  payload: Payload;
}): Promise<TReturn> {
  try {
    return await pRetry(
      async () =>
        postMessage({
          recipient: await getSandbox(),
          payload,
          type,
        }),
      {
        retries: MAX_RETRIES,
        shouldRetry: (error) =>
          isSpecificError(error, TimeoutError) ||
          isSpecificError(error, IframeInjectionError) ||
          isSpecificError(error, SandboxTimeoutError),
        onFailedAttempt(error) {
          console.warn(
            `Failed to send message ${type} to sandbox. Retrying... Attempt ${error.attemptNumber}`,
          );
        },
      },
    );
  } catch (error) {
    if (
      isSpecificError(error, TimeoutError) ||
      isSpecificError(error, IframeInjectionError) ||
      isSpecificError(error, SandboxTimeoutError)
    ) {
      throw new Error(
        `Failed to send message ${type} to sandbox. The host page may be preventing the sandbox from loading.`,
        {
          cause: error,
        },
      );
    }

    throw error;
  }
}

export type TemplateRenderPayload = {
  template: string;
  context: JsonObject;
  autoescape: boolean;
};

export type TemplateValidatePayload = string;

export async function renderNunjucksTemplate(
  payload: TemplateRenderPayload,
): Promise<string> {
  const result = await sendSandboxMessage("RENDER_NUNJUCKS", payload);
  console.log("renderNunjucksTemplate result:", result);
  return result;
}

export async function validateNunjucksTemplate(
  payload: TemplateValidatePayload,
): Promise<void> {
  return postSandboxMessage({
    payload,
    type: "VALIDATE_NUNJUCKS",
  });
}

export async function renderHandlebarsTemplate(
  payload: TemplateRenderPayload,
): Promise<string> {
  return postSandboxMessage({
    payload,
    type: "RENDER_HANDLEBARS",
  });
}

export type JavaScriptPayload = {
  code: string;
  data?: JsonObject;
};

export async function runUserJs(payload: JavaScriptPayload) {
  return postSandboxMessage({
    payload,
    type: "RUN_USER_JS",
  });
}
