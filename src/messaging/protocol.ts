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

import { ActionType, Message, SerializedError, Meta } from "@/core";
import { serializeError } from "serialize-error";
import { browser, Runtime } from "webextension-polyfill-ts";
import isPromise from "is-promise";

// eslint-disable-next-line @typescript-eslint/ban-types
export type SerializableResponse = boolean | string | number | object;

export interface RemoteProcedureCallRequest<TMeta extends Meta = Meta>
  extends Message<ActionType, TMeta> {
  payload: unknown[];
}

export type HandlerOptions = {
  asyncResponse?: boolean;
};

export type Handler = (...args: unknown[]) => SerializableResponse;

export type HandlerEntry = {
  handler: Handler;
  options: HandlerOptions;
};

interface ErrorResponse {
  $$error: SerializedError;
}

export function isNotification({
  asyncResponse = true,
}: HandlerOptions = {}): boolean {
  return !asyncResponse;
}

export function isErrorResponse(ex: unknown): ex is ErrorResponse {
  return typeof ex === "object" && ex != null && "$$error" in ex;
}

export function toErrorResponse(
  requestType: string,
  ex: unknown
): ErrorResponse {
  return { $$error: serializeError(ex) };
}

export function isRemoteProcedureCallRequest(
  message: unknown
): message is RemoteProcedureCallRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- This is a type guard function and it uses ?.
  return typeof (message as any)?.type === "string";
}

export function allowSender(sender: Runtime.MessageSender): boolean {
  return sender.id === browser.runtime.id;
}

export type MessageListener = (
  request: Message,
  sender: Runtime.MessageSender
) => Promise<unknown> | void;

// Unlike MessageListener, the return type of this method means the message has been handled
export type MessageHandler<T extends ActionType> = (
  request: Message<T>,
  sender: Runtime.MessageSender
) => Promise<unknown>;

export class HandlerMap {
  readonly handlers = new Map<ActionType, MessageHandler<ActionType>>();

  // Our best bet for getting types to match is to write them on the "set" method, as that's where we have
  // the correspondence between the actionType and the handler.
  //
  // There's a way to enforce the correspondence unless we force the call-site to list actionType
  // twice, once in the type and once for the argument. See discussion of a similar method in redux-toolkit:
  // https://redux-toolkit.js.org/usage/usage-with-typescript#building-type-safe-reducer-argument-objects
  //
  // Another thing to be aware of is how callback types are checked when strictFunctionType is not on:
  // https://www.typescriptlang.org/tsconfig/strictFunctionTypes.html
  set<T extends ActionType>(actionType: T, handler: MessageHandler<T>): this {
    if (this.handlers.has(actionType)) {
      throw new Error(`Handler for ${actionType} already defined`);
    }
    this.handlers.set(actionType, handler);
    return this;
  }

  asListener(): MessageListener {
    // Cannot use async keyword here because we need to be able to return a pure void/undefined response if the
    // message is not handled by this listener
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    return (request: Message, sender: Runtime.MessageSender) => {
      // Returning "undefined" indicates the message hasn't been handled by the listener
      if (!allowSender(sender)) {
        return;
      }
      const handler = this.handlers.get(request.type);
      if (handler) {
        console.trace("Handling message: %s", request.type);
        const promise = handler(request, sender);
        if (!isPromise(promise)) {
          throw new Error(
            `Expected promise response from handler ${request.type}`
          );
        }
        return promise;
      }
    };
  }
}
