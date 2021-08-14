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

export type BaseActionType = string;
export type BasePayload = Record<string, unknown>;

export type Method<T extends BasePayload = BasePayload> = (
  arg: T
) => Promise<unknown>;

export type Message<
  T extends BaseActionType = BaseActionType,
  P extends BasePayload = BasePayload
> = {
  type: T;
  payload: P;
};

export function isMessage(value: unknown): value is Message {
  return (
    typeof value === "object" &&
    typeof (value as any).type === "string" &&
    typeof (value as any).message === "object"
  );
}

export const FORWARD_MESSAGE_TYPE = "@@/forward";

/**
 * See Runtime.MessageSender
 */
export type ExtensionSender =
  | { actor: "background" }
  | {
      tabId: number;
      frameId: number;
      actor: Exclude<
        ActorType,
        "background" | "devtools" | "external" | "contentScript"
      >;
    }
  | {
      tabId: number;
      frameId: number;
      url: string;
      actor: Exclude<ActorType, "background" | "devtools"> | string;
    };

export type ForwardMessage = {
  type: typeof FORWARD_MESSAGE_TYPE;
  payload: {
    /**
     * The original target of the message
     */
    target: Target;

    /**
     * The original message
     */
    sender: ExtensionSender;

    /**
     * The original message
     */
    message: Message;
  };
};

export type Meta = {
  /**
   * The original sender of the message.
   */
  sender: ExtensionSender;

  /**
   * The sender that sent the last hop of the message.
   */
  immediateSender: ExtensionSender;
};

export type Handler<
  T extends BaseActionType = string,
  P extends BasePayload = BasePayload,
  M extends Method<P> = Method
> = (payload: Message<T, P>["payload"], meta: Meta) => ReturnType<M>;

type ActorType =
  | "background"
  | "extension"
  | "contentScript"
  | "devtools"
  | "external"
  | "pageScript";

export type Target =
  | { actor: "background" }
  | { tabId: number; actor: "extension" }
  | { tabId: "*"; actor: "contentScript" | "external" }
  | {
      tabId: number;
      frameId: number;
      actor: Exclude<ActorType, "background" | "extension"> | string;
      /**
       * Optional provide a URL to match for the message to be accepted
       */
      url?: string;
    };

export type Contract<
  T extends BaseActionType = BaseActionType,
  M extends Method = Method
> = {
  type: T;
  method: M;
};

export type Payload<T extends Method> = Parameters<T>[0];

export type ContractHandler<T extends Contract> = (
  payload: Payload<T["method"]>,
  meta: Meta
) => ReturnType<T["method"]>;

/**
 * Type for passing arg-style operations
 */
export type ActionCreator<T extends Contract> = (
  ...args: unknown[]
) => Message<T["type"], Payload<T["method"]>>;

export type MessageOptions = {
  /**
   * True iff the message is a notification. For notification, the promise resolves when the message is successfully
   * acknowledged, not when the response is received.
   */
  notification?: boolean;

  /**
   * Maximum amount of time to try resend the message (in milliseconds)
   */
  retryMillis?: number;
};
