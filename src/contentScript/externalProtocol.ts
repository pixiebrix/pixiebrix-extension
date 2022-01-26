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

import { uuidv4 } from "@/types/helpers";
import {
  HandlerEntry,
  HandlerOptions,
  isErrorResponse,
  SerializableResponse,
  toErrorResponse,
} from "@/messaging/protocol";
import pTimeout from "p-timeout";
import oneMutation from "one-mutation";
import { isContentScript } from "webext-detect-page";
import { deserializeError } from "serialize-error";
import { expectContext, forbidContext } from "@/utils/expectContext";
import { PIXIEBRIX_READY_ATTRIBUTE } from "@/common";

// Context for this protocol:
// - Implemented and explained in https://github.com/pixiebrix/pixiebrix-extension/pull/1019
// - It's only one-way from the app to the content scripts
// - The communication happens via posted messages
// - Messages **are received by both ends**, so they use the `type` property as a differentiator
// - The app sends messages with a `type` property
// - The content script responds without `type` property

// TODO: The content script should load within 200ms, but when the devtools are open it could take 4-5 seconds.
//  Find out why https://github.com/pixiebrix/pixiebrix-extension/pull/1019#discussion_r684894579
const POLL_READY_TIMEOUT =
  process.env.ENVIRONMENT === "development" ? 6000 : 2000;

// TODO: Some handlers could take longer, so it needs to be refactored.
//  https://github.com/pixiebrix/pixiebrix-extension/issues/1015
const RESPONSE_TIMEOUT_MS = 2000;

const MESSAGE_PREFIX = "@@pixiebrix/external/";

interface Message<R = unknown> {
  type: string;
  payload: R;
  meta: {
    nonce: string;
  };
}

interface Response<R = unknown> {
  payload: R;
  meta: {
    nonce: string;
  };
}

const contentScriptHandlers = new Map<string, HandlerEntry>();

async function waitExtensionLoaded(): Promise<void> {
  if (document.documentElement.hasAttribute(PIXIEBRIX_READY_ATTRIBUTE)) {
    return;
  }

  await pTimeout(
    oneMutation(document.documentElement, {
      attributes: true,
      attributeFilter: [PIXIEBRIX_READY_ATTRIBUTE],
    }),
    POLL_READY_TIMEOUT,
    `The extension did not load within ${POLL_READY_TIMEOUT / 1000}s`
  );
}

/**
 * The message is also received by the same context, so it must detect that and
 * ignore its own messages. Currently it uses the `type` property as a differentiator:
 * The lack of it means it's a response from the content script
 */
function sendMessageToOtherSide(message: Message | Response) {
  document.defaultView.postMessage(message, document.defaultView.origin);
}

/** Content script handler for messages from app */
async function onContentScriptReceiveMessage(
  event: MessageEvent<Message>
): Promise<void> {
  expectContext("contentScript");

  if (event.source !== document.defaultView) {
    // The message comes from other views (PB does not send these)
    return;
  }

  const { type, meta, payload } = event.data;
  if (!type || !Array.isArray(payload)) {
    // It might be a response that `onContentScriptReceiveMessage` itself sent
    return;
  }

  const { handler, options } = contentScriptHandlers.get(type) ?? {};
  if (!handler) {
    // Handler not registered, it might be handled elsewhere
    return;
  }

  if (!options.asyncResponse) {
    void handler(...payload).catch((error) => {
      console.warn(`${type}: ${meta.nonce}: Notification error`, error);
    });
  }

  const response: Response = {
    meta,
    payload: null,
  };
  try {
    response.payload = await handler(...payload);
    console.debug(`${type}: ${meta.nonce}: Handler success`);
  } catch (error) {
    response.payload = toErrorResponse(type, error);
    console.warn(`${type}: ${meta.nonce}: Handler error`, error);
  }

  sendMessageToOtherSide(response);
}

/** Set up listener for specific message via nonce */
async function oneResponse<R>(nonce: string): Promise<R> {
  return new Promise((resolve) => {
    function onMessage(event: MessageEvent) {
      // Responses *must not* have a `type`, but just a `nonce` and `payload`
      if (!event.data?.type && event.data?.meta?.nonce === nonce) {
        document.defaultView.removeEventListener("message", onMessage);
        resolve(event.data.payload);
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
    // Register global handler; Automatically deduplicated
    document.defaultView.addEventListener(
      "message",
      onContentScriptReceiveMessage
    );

    contentScriptHandlers.set(fullType, { handler: method, options });
    console.debug(`${fullType}: Installed content script handler`);
    return method;
  }

  return async (...args: TArguments) => {
    forbidContext("extension");

    await waitExtensionLoaded();

    const nonce = uuidv4();
    const message: Message = {
      type: fullType,
      payload: args,
      meta: { nonce },
    };

    console.debug(`${fullType}: Sending from app`, message);
    sendMessageToOtherSide(message);

    // Communication is completely asynchronous; This sets up response for the specific nonce
    const payload = await pTimeout(oneResponse<R>(nonce), RESPONSE_TIMEOUT_MS);

    if (isErrorResponse(payload)) {
      throw deserializeError(payload.$$error);
    }

    return payload;
  };
}
