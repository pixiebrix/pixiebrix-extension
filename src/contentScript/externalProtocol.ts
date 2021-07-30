/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { v4 as uuidv4 } from "uuid";
import {
  HandlerEntry,
  HandlerOptions,
  isErrorResponse,
  SerializableResponse,
  toErrorResponse,
} from "@/messaging/protocol";
import oneMutation from "one-mutation";
import { isContentScript, isExtensionContext } from "webext-detect-page";
import { deserializeError } from "serialize-error";
import { ContentScriptActionError } from "@/contentScript/backgroundProtocol";
import { PIXIEBRIX_READY_ATTRIBUTE } from "@/contentScript/context";
import { sleep } from "@/utils";
import { expectContentScript } from "@/utils/expectContext";

const POLL_READY_TIMEOUT = 2000;
const MESSAGE_PREFIX = "@@pixiebrix/external/";

interface PostedMessage {
  type: string;
  meta: {
    nonce: string;
  };
  payload: unknown[];
}

interface MessageResponse<R> {
  meta: {
    nonce: string;
  };
  payload: R;
}

const contentScriptHandlers = new Map<string, HandlerEntry>();

async function waitExtensionLoaded(): Promise<void> {
  // Wait for the extension to load before sending the message
  if (document.documentElement.hasAttribute(PIXIEBRIX_READY_ATTRIBUTE)) {
    return;
  }

  await Promise.race([
    oneMutation(document.documentElement, {
      attributes: true,
      attributeFilter: [PIXIEBRIX_READY_ATTRIBUTE],
    }),

    // TODO: Replace `sleep` with `p-timeout`
    // Timeouts are temporarily being let through just for backwards compatibility.
    sleep(POLL_READY_TIMEOUT),
  ]);
}

function sendMessageToOtherSide(
  message: PostedMessage | MessageResponse<unknown>
) {
  document.defaultView.postMessage(message, document.defaultView.origin);
}

/** Content script handler for messages from app */
async function onLifterMessage(
  event: MessageEvent<PostedMessage>
): Promise<void> {
  expectContentScript();

  // Ignore messages coming from other views (PB does not send these)
  if (event.source !== document.defaultView) {
    return;
  }

  const { type, meta, payload } = event.data;
  const { handler, options } = contentScriptHandlers.get(type) ?? {};

  if (!handler) {
    return;
  }

  if (options.asyncResponse) {
    void handler(...payload).catch((error: unknown) => {
      console.warn(`${type}: Notification error`, error);
    });

    return;
  }

  try {
    sendMessageToOtherSide({
      meta,
      payload: await handler(...payload),
    });
    console.debug(`${type}: ${meta.nonce}: Handler success`);
  } catch (error: unknown) {
    sendMessageToOtherSide({
      meta,
      payload: toErrorResponse(type, error),
    });
    console.debug(`${type}: ${meta.nonce}: Handler error`);
  }
}

/** Set up listener for specific message via nonce */
async function oneResponse<R>(nonce: string): Promise<R> {
  return new Promise((resolve) => {
    function onMessage(event: MessageEvent) {
      if (event.data?.meta?.nonce === nonce) {
        resolve(event.data.payload);
        document.defaultView.removeEventListener("message", onMessage);
      }
    }

    document.defaultView.addEventListener("message", onMessage);
  });
}

export function liftExternal<
  TArguments extends unknown[],
  R extends SerializableResponse
>(
  type: string,
  method: (...args: TArguments) => Promise<R>,
  options: HandlerOptions = {}
): (...args: TArguments) => Promise<R> {
  const fullType = `${MESSAGE_PREFIX}${type}`;
  // Set defaults
  options = {
    asyncResponse: true,
    ...options,
  };

  if (isContentScript()) {
    // Register handler; Automatically deduplicated
    document.defaultView.addEventListener("message", onLifterMessage);

    contentScriptHandlers.set(fullType, { handler: method, options });
    console.debug(`${fullType}: Installed content script handler`);
    return method;
  }

  if (isExtensionContext()) {
    throw new ContentScriptActionError("Expected call from external page");
  }

  return async (...args: TArguments) => {
    await waitExtensionLoaded();

    const nonce = uuidv4();
    const message: PostedMessage = {
      type: fullType,
      payload: args,
      meta: { nonce },
    };

    console.debug("Sending message from page to content script", message);
    sendMessageToOtherSide(message);

    if (!options.asyncResponse) {
      return;
    }

    // Communication is completely asynchronous; This sets up response for the specific nonce
    const payload = await oneResponse<R>(nonce);

    if (isErrorResponse(payload)) {
      throw deserializeError(payload.$$error);
    }

    return payload;
  };
}

/** @deprecated The registration now happens automatically */
export default () => {};
