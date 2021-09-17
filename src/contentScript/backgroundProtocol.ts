/* eslint-disable filenames/match-exported */
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

import {
  allowSender,
  HandlerEntry,
  HandlerOptions,
  isErrorResponse,
  isNotification,
  RemoteProcedureCallRequest,
  SerializableResponse,
  toErrorResponse,
} from "@/messaging/protocol";
import { isContentScript } from "webext-detect-page";
import { deserializeError } from "serialize-error";
import { browser, Runtime } from "webextension-polyfill-ts";
import { expectContext } from "@/utils/expectContext";
import { getErrorMessage } from "@/errors";
import type { Target } from "@/types";

export const MESSAGE_PREFIX = "@@pixiebrix/contentScript/";
export const ROOT_FRAME_ID = 0;

export class ContentScriptActionError extends Error {
  errors: unknown;

  constructor(message: string) {
    super(message);
    this.name = "ContentScriptActionError";
  }
}

const handlers = new Map<string, HandlerEntry>();

async function handleRequest(
  request: RemoteProcedureCallRequest
): Promise<unknown> {
  const { type, payload } = request;
  const { handler, options } = handlers.get(type) ?? {};

  console.debug(`Handling contentScript action ${type}`);

  if (isNotification(options)) {
    void handler(...payload);
    return;
  }

  try {
    return await handler(...payload);
  } catch (error: unknown) {
    console.debug(`Handler returning error response for ${type}`, {
      error,
    });
    return toErrorResponse(
      type,
      error ?? new Error("Unknown error in content script handler")
    );
  }
}

/**
 * Lift a method to be run in the contentScript
 * @param type a unique name for the contentScript action
 * @param method the method to lift
 * @param options contentScript action handler options
 */
export function liftContentScript<
  TArguments extends unknown[],
  R extends SerializableResponse
>(
  type: string,
  method: (...args: TArguments) => Promise<R>,
  options?: HandlerOptions
): (target: Target | null, ...args: TArguments) => Promise<R> {
  const fullType = `${MESSAGE_PREFIX}${type}`;

  if (isContentScript()) {
    // AddContentScriptListener logs to console when the handler is installed on the window. So it would be confusing
    // to include a console.debug statement here
    handlers.set(fullType, { handler: method, options });
  }

  return async (target: Target | null, ...args: unknown[]) => {
    if (isContentScript()) {
      console.debug("Resolving call from the contentScript immediately");
      return method(...(args as TArguments));
    }

    expectContext("background", ContentScriptActionError);

    console.debug(
      `Sending content script action ${fullType} to tab ${
        target?.tabId ?? "<all>"
      }, frame ${target?.frameId ?? ROOT_FRAME_ID}`
    );

    let response;

    try {
      response = await browser.tabs.sendMessage(
        target?.tabId,
        {
          type: fullType,
          payload: args,
        },
        { frameId: target.frameId ?? ROOT_FRAME_ID }
      );
    } catch (error: unknown) {
      if (
        isNotification(options) &&
        getErrorMessage(error).includes("Receiving end does not exist")
      ) {
        // Ignore the content script not being loaded
        return;
      }

      console.debug(
        `Error sending content script ${
          isNotification(options) ? "notification" : "action"
        } ${type}`,
        {
          target,
          error,
        }
      );

      if (isNotification(options)) {
        return;
      }

      throw error;
    }

    if (isErrorResponse(response)) {
      throw deserializeError(response.$$error);
    }

    return response;
  };
}

function contentScriptListener(
  request: RemoteProcedureCallRequest,
  sender: Runtime.MessageSender
): Promise<unknown> | void {
  // Returning "undefined" indicates that the message has not been handled

  if (!allowSender(sender)) {
    return;
  }

  if (handlers.has(request.type)) {
    return handleRequest(request);
  }
}

function addContentScriptListener(): void {
  expectContext("contentScript");

  browser.runtime.onMessage.addListener(contentScriptListener);
  console.debug(
    "Installed handlers for %d actions/notifications",
    handlers.size,
    {
      actions: [...handlers.keys()],
    }
  );
}

export default addContentScriptListener;
