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

import objectHash from "object-hash";
import {
  FORWARD_MESSAGE_TYPE,
  Message,
  Target,
  Handler,
  Meta,
  ExtensionSender,
  ForwardMessage,
  MessageOptions,
  Contract,
  ContractHandler,
} from "@/messaging/framework/types";
import { isConnectionError } from "@/errors";
import { sleep } from "@/utils";

const RECEIVER_READY_POLL_MILLIS = 250;

export type MessagePromise = {
  message: Message;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
} & MessageOptions;

export type RoutedMessage = {
  // Enforce nominal typing
  _routedMessageBrand: null;
  target: Target;
  message: Message;
};

export abstract class Actor {
  // Future work?: support an idempotency header field: https://tools.ietf.org/id/draft-idempotency-header-01.html
  // Not necessary now, but necessary if non-persistent background service worker in MV3 causes some background
  // work to arbitrarily fail: (see https://github.com/w3c/webextensions/issues/16)

  // Future work? https://en.wikipedia.org/wiki/Dead_letter_queue

  /**
   * If the target is not available yet (and there's a max wait time), queue the messages so that messages are
   * sent deterministically based on the order in which sendMessage was called.
   */
  private readonly messageQueues = new Map<string, MessagePromise[]>();

  private readonly activeQueues = new Set<string>();

  private readonly handlers = new Map<string, Handler>();

  /**
   * Set up listeners for the different channels that that the actor sends/received messages on.
   */
  public abstract initialize(): void;

  /**
   * Returns the target for this actor
   */
  protected abstract get self(): ExtensionSender;

  /**
   * Transform the target/message prior to sending (if necessary):
   * 1. Wrap the message in a FORWARD_MESSAGE_TYPE message
   * 2. Change the target to the next hop that gets the message to its destination
   */
  protected route(target: Target, message: Message): RoutedMessage {
    return {
      target,
      message,
    } as RoutedMessage;
  }

  public addHandler<T extends Contract>(
    type: T["type"],
    handler: ContractHandler<T>
  ): void {
    if (this.handlers.get(type)) {
      throw new Error(`Handler already set for ${type}`);
    }

    this.handlers.set(type, handler);
  }

  /**
   * Send the message on the appropriate channel. Examples of channels include:
   * - browser.tabs
   * - browser.runtime
   * - external connection polyfill
   * - persistent ports
   */
  protected async send(_message: RoutedMessage): Promise<unknown> {
    throw new Error("Send not implemented for target");
  }

  // Using undefined to distinguish between handled and unhandled messages
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  protected handle(meta: Meta, message: Message): Promise<unknown> | undefined {
    // XXX: check the intended target here and drop if it's not valid (e.g., if the URL changed)

    if (message.type === FORWARD_MESSAGE_TYPE) {
      const forward = message as ForwardMessage;
      const routed = this.route(
        forward.payload.target,
        forward.payload.message
      );
      return this.sendMessage(routed.target, routed.message);
    }

    const handler = this.handlers.get(message.type);
    if (handler) {
      return handler(message, meta);
    }

    return undefined;
  }

  private async queueMessage(
    target: Target,
    message: Message
  ): Promise<unknown> {
    const targetHash = objectHash(target);
    if (!this.messageQueues.has(targetHash)) {
      this.messageQueues.set(targetHash, []);
    }

    return new Promise((resolve, reject) => {
      this.messageQueues.get(targetHash).push({
        message,
        resolve,
        reject,
      });

      if (!this.activeQueues.has(targetHash)) {
        void this.pollRetry(target);
      }
    });
  }

  private async sendSingleMessage(
    target: Target,
    { resolve, reject, message, retryMillis = 0, notification }: MessagePromise
  ) {
    // TODO: don't do dumb polling, instead support chatter between the actors so they know which targets are ready

    const start = Date.now();

    while (Date.now() - start < retryMillis) {
      try {
        // FIXME: handle notifications properly here: how do we wait for the ack without waiting for the value?
        // eslint-disable-next-line no-await-in-loop -- intentionally blocking
        resolve(await this.send({ target, message }));
      } catch (error: unknown) {
        if (isConnectionError(error)) {
          // Wait and try again
          // eslint-disable-next-line no-await-in-loop -- intentionally blocking
          await sleep(RECEIVER_READY_POLL_MILLIS);
        } else {
          // FIXME: handle error serialization here?
          reject(error);
          return;
        }
      }
    }

    // XXX: improve this error message
    reject(new Error("message not sent"));
  }

  /**
   * Sends queued messages to target
   * @param target
   */
  private async pollRetry(target: Target): Promise<void> {
    const targetHash = objectHash(target);
    this.activeQueues.add(targetHash);

    const next = () => this.messageQueues.get(objectHash(target)).shift();

    try {
      for (let item = next(); item != null; item = next()) {
        // eslint-disable-next-line no-await-in-loop -- intentionally blocking
        await this.sendSingleMessage(target, item);
      }
    } finally {
      this.activeQueues.delete(targetHash);
    }
  }

  public async sendMessage(target: Target, message: Message): Promise<unknown> {
    return this.queueMessage(target, message);
  }
}
