/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Message, SerializedError } from "@/core";
import { serializeError } from "serialize-error";
import { browser, Runtime } from "webextension-polyfill-ts";

// eslint-disable-next-line @typescript-eslint/ban-types
export type SerializableResponse = boolean | string | number | object;

interface Meta {
  nonce?: string;
}

export interface RemoteProcedureCallRequest<TMeta extends Meta = Meta> {
  type: string;
  meta?: TMeta;
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

export type MessageListener = (
  request: Message,
  sender: Runtime.MessageSender
) => Promise<unknown> | void;

export function allowSender(sender: Runtime.MessageSender): boolean {
  return sender.id === browser.runtime.id;
}

// https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
export type MessageTypeOf<M> = M extends Message<infer T> ? T : never;

export class HandlerMap {
  readonly handlers = new Map<string, MessageListener>();

  // The typing isn't quite right here. The actionType/action correspondence doesn't get enforced at the
  // call-site because the actionType is just inferred to be string and not the typeof the constant being
  // passed in.
  set<M extends Message<T>, T extends string>(
    actionType: MessageTypeOf<M>,
    value: (action: M, sender: Runtime.MessageSender) => Promise<unknown> | void
  ): this {
    if (this.handlers.has(actionType)) {
      throw new Error(`Handler for ${actionType} already defined`);
    }
    this.handlers.set(actionType, value);
    return this;
  }

  asListener(): MessageListener {
    return (request: Message, sender: Runtime.MessageSender) => {
      if (!allowSender(sender)) {
        return;
      }
      const handler = this.handlers.get(request.type);
      if (handler) {
        return handler(request, sender);
      }
    };
  }
}
