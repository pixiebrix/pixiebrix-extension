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
import pTimeout from "p-timeout";
import oneMutation from "one-mutation";
import { isContentScript, isExtensionContext } from "webext-detect-page";
import { deserializeError } from "serialize-error";
import { ContentScriptActionError } from "@/contentScript/backgroundProtocol";
import { PIXIEBRIX_READY_ATTRIBUTE } from "@/contentScript/context";
import { expectContentScript } from "@/utils/expectContext";

const POLL_READY_TIMEOUT = 2000;
const RESPONSE_TIMEOUT = 2000; // XXX: Might need to be longer
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
  isResponse: true;
  payload: R;
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

  if (!options.asyncResponse) {
    sendMessageToOtherSide({
      meta,
      payload: null,
      isResponse: true,
    });
    void handler(...payload).catch((error: unknown) => {
      console.warn(`${type}: Notification error`, error);
    });

    return;
  }

  try {
    sendMessageToOtherSide({
      meta,
      payload: await handler(...payload),
      isResponse: true,
    });
    console.debug(`${type}: ${meta.nonce}: Handler success`);
  } catch (error: unknown) {
    sendMessageToOtherSide({
      meta,
      payload: toErrorResponse(type, error),
      isResponse: true,
    });
    console.debug(`${type}: ${meta.nonce}: Handler error`);
  }
}

/** Set up listener for specific message via nonce */
async function oneResponse<R>(nonce: string): Promise<R> {
  return new Promise((resolve) => {
    function onMessage(event: MessageEvent) {
      if (event.data?.isResponse && event.data?.meta?.nonce === nonce) {
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
    // Register global handler; Automatically deduplicated
    document.defaultView.addEventListener("message", onLifterMessage);

    contentScriptHandlers.set(fullType, { handler: method, options });
    console.debug(`${fullType}: Installed content script handler`);
    return method;
  }

  return async (...args: TArguments) => {
    if (isExtensionContext()) {
      throw new ContentScriptActionError("Expected call from external page");
    }

    await waitExtensionLoaded();

    const nonce = uuidv4();
    const message: PostedMessage = {
      type: fullType,
      payload: args,
      meta: { nonce },
    };

    console.debug(`${fullType}: Sending from app`, message);
    sendMessageToOtherSide(message);

    // Communication is completely asynchronous; This sets up response for the specific nonce
    const payload = await pTimeout(oneResponse<R>(nonce), RESPONSE_TIMEOUT);

    if (isErrorResponse(payload)) {
      throw deserializeError(payload.$$error);
    }

    return payload;
  };
}

/** @deprecated The registration now happens automatically */
export default () => {};
