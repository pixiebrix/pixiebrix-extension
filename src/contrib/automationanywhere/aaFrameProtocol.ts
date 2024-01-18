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
import { getTopFrameFromSidebar } from "@/mv3/sidePanelMigration";
import { getCopilotHostData } from "@/contentScript/messenger/api";

/**
 * Runtime event type for setting Co-Pilot data
 */
export const SET_COPILOT_DATA_MESSAGE_TYPE = "SET_COPILOT_DATA";

/**
 * Mapping from processId to form data.
 */
export type ProcessDataMap = Record<string, UnknownObject>;

/**
 * `window.postMessage` data payload the Co-Pilot frame sends to the host application.
 * https://docs.automationanywhere.com/bundle/enterprise-v2019/page/co-pilot-map-host-data.html
 */
type AariDataRequestData = {
  aariDataRequest: "aari-data-request";
  processId: string;
  // XXX: when would botId be non-null?
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
  args: [ProcessDataMap];
};

/**
 * Mapping from processId to form data.
 */
// eslint-disable-next-line local-rules/persistBackgroundData -- Unused there
const hostData = new Map<string, UnknownObject>();

function setHostData(processDataMap: ProcessDataMap): void {
  // Maintain the reference so that the listener can access the data
  hostData.clear();

  for (const [processId, data] of Object.entries(processDataMap)) {
    hostData.set(processId, data);
  }
}

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
export async function initCopilotMessenger(): Promise<void> {
  expectContext(
    "extension",
    "should only be run in sidebar or frame tiny page",
  );

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

      setHostData(message.args[0]);
    }

    // Always return undefined to indicate not handled. That ensures all PixieBrix frames on the page have the context
    // necessary to pass to the Co-Pilot frame.
  });

  // Fetch the current data from the content script when the frame loads
  const frame = await getTopFrameFromSidebar();
  const data = await getCopilotHostData(frame);
  console.debug("Setting initial Co-Pilot data", {
    location: window.location.href,
    data,
  });
  setHostData(data);
}
