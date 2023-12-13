/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { type UnknownObject } from "@/types/objectTypes";
import { expectContext } from "@/utils/expectContext";

/**
 * Runtime event type for setting Co-Pilot data
 */
export const SET_COPILOT_DATA_MESSAGE_TYPE = "SET_COPILOT_DATA";

/**
 * `window.postMessage` data payload the Co-Pilot frame sends to the host application.
 * https://docs.automationanywhere.com/bundle/enterprise-v2019/page/co-pilot-map-host-data.html
 */
type AariDataRequestData = {
  aariDataRequest: "aari-data-request";
  processId: string;
  // When would botId be provided?
  botId: string | null;
};

/**
 * Runtime message to set the Co-Pilot data per process id.
 * @see MessengerMessage
 */
export type SetCopilotDataMessage = {
  // Follows webext-messenger message format
  type: typeof SET_COPILOT_DATA_MESSAGE_TYPE;
  target: {
    page: string;
  };
  args: [Record<string, UnknownObject>];
};

/**
 * Mapping from processId to form data.
 */
const hostData = new Map<string, UnknownObject>();

function isSetCopilotDataMessage(
  message?: UnknownObject,
): message is SetCopilotDataMessage {
  return message?.type === SET_COPILOT_DATA_MESSAGE_TYPE;
}

function isMessageTarget(message: SetCopilotDataMessage): boolean {
  // Mimic the page filtering of webext-messenger
  return message.target.page === window.location.pathname;
}

function isAariDataRequestData(
  data?: UnknownObject,
): data is AariDataRequestData {
  return data?.aariDataRequest === "aari-data-request";
}

/**
 * Initialize the Automation Anywhere Co-Pilot window and runtime messenger.
 */
export function initCopilotMessenger(): void {
  expectContext("extension", "should only be run in sidebar or frame");

  window.addEventListener("message", (event: MessageEvent<UnknownObject>) => {
    if (isAariDataRequestData(event.data)) {
      const data = hostData.get(event.data.processId) ?? {};

      console.debug("Received AARI data request", {
        event,
        currentProcessData: data,
      });

      // @ts-expect-error -- incorrect types https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#examples
      event.source.postMessage({ data }, event.origin);
    }
  });

  // Setting the runtime handler directly instead of the messenger to keep this file self-contained
  browser.runtime.onMessage.addListener((message: UnknownObject) => {
    // Mimic the page filtering of webext-messenger
    if (isSetCopilotDataMessage(message) && isMessageTarget(message)) {
      console.debug("Setting Co-Pilot data", {
        location: window.location.href,
        data: message.args[0],
      });

      hostData.clear();

      for (const [processId, data] of Object.entries(message.args[0])) {
        hostData.set(processId, data);
      }
    }

    // Always return undefined to indicate not handled. That ensures all PixieBrix frames on the page have the context
    // necessary to pass to the Co-Pilot frame.
  });
}
