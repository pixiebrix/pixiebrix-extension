/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { expectContext } from "../../utils/expectContext";
import { getConnectedTarget } from "../../sidebar/connectedTarget";
import { getCopilotHostData } from "../../contentScript/messenger/api";
import {
  type ProcessDataMap,
  SET_COPILOT_DATA_MESSAGE_TYPE,
} from "./aaTypes";
import { type TopLevelFrame } from "webext-messenger";

/**
 * `window.postMessage` data payload the Co-Pilot frame sends to the host application.
 * https://docs.automationanywhere.com/bundle/enterprise-v2019/page/co-pilot-map-host-data.html
 */
type AariDataRequestData = {
  // NOTE: the frame messaging protocol still uses aari naming, and not automation co-pilot
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
        location: window.location.href,
        event,
        currentProcessData: data,
      });

      // @ts-expect-error -- incorrect types https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#examples
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access -- See above
      event.source.parent?.postMessage({ data }, event.origin);
    }
  });

  // Setting the runtime handler directly instead of the messenger to keep this file self-contained
  browser.runtime.onMessage.addListener((message: UnknownObject): undefined => {
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

  let connectedTarget: TopLevelFrame | null = null;
  try {
    // Note: This code can be run either in the sidebar or in a modal. Currently,
    // it sometimes also runs in nested frames in the MV3 sidebar, in which case
    // the webext-messenger getTopLevelFrame() function currently cannot return
    // a frameId/tabId, due to how it's implemented. It will throw an error, and
    // in this specific case we don't want to be running the CoPilot Data
    // initialization on a nested frame anyway, so we'll just eat the error and
    // warn to console for now.
    connectedTarget = await getConnectedTarget();
  } catch (error) {
    console.warn(
      "Error getting connected target, aborting co-pilot messenger initialization",
      error,
    );
  }

  if (!connectedTarget) {
    return;
  }

  // Fetch the current data from the content script when the target frame loads
  const data = await getCopilotHostData(connectedTarget);
  console.debug("Setting initial Co-Pilot data", {
    location: window.location.href,
    data,
  });
  setHostData(data);
}
