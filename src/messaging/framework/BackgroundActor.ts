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
  FORWARD_MESSAGE_TYPE,
  isMessage,
  Message,
  Target,
} from "@/messaging/framework/types";
import { Actor, RoutedMessage } from "@/messaging/framework/actor";
import MessageSender = browser.runtime.MessageSender;

/**
 * Background script actor
 *
 * - Connects via port to devtools
 * - Connects via runtime or polyfill to script
 * - Connects via runtime to extension pages
 * - Forwards messages to script via content script
 */
class BackgroundActor extends Actor {
  public get self(): { actor: "background" } {
    return { actor: "background" };
  }

  protected route(target: Target, message: Message): RoutedMessage {
    if (target.actor === "pageScript") {
      return ({
        target: {
          ...target,
          actor: "contentScript",
        },
        message: {
          type: FORWARD_MESSAGE_TYPE,
          payload: {
            // sender: figure out how to include information about the original sender here
            message,
          },
        },
      } as unknown) as RoutedMessage;
    }

    return super.route(target, message);
  }

  public initialize() {
    // Intentionally not using async so that we can return undefined to indicate the message was not handled
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    browser.runtime.onMessage.addListener(
      (message: unknown, sender: MessageSender) => {
        if (isMessage(message)) {
          return this.handle(
            {
              // FIXME: figure out how to pass around sender and immediate sender
              sender: null,
              immediateSender: {
                tabId: sender.tab.id,
                frameId: sender.frameId,
                actor: null,
              },
            },
            message
          );
        }
      }
    );
  }

  protected async send(routedMessage: RoutedMessage) {
    const { target, message } = routedMessage;

    if (target.actor === "background") {
      console.warn(
        "background script sent message to itself; call the method directly"
      );
      await this.handle(
        { immediateSender: this.self, sender: this.self },
        message
      );
    }

    if (target.actor === "contentScript") {
      if (target.tabId === "*") {
        // See existing logic: http://github.com/pixiebrix/pixiebrix-extension/blob/11c65b538054706d15de4c07afb8a1996dd82618/src/contentScript/backgroundProtocol.ts#L125-L125
        // return browser.runtime.sendMessage(, message, {frameId: 0});
        throw new Error("broadcast not implemented");
      }

      // FIXME: handle error deserialization here?
      return browser.tabs.sendMessage(target.tabId, message, {
        frameId: target.frameId,
      });
    }

    return super.send(routedMessage);
  }
}

export default BackgroundActor;
