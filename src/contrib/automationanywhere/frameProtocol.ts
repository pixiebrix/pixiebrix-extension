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
export const SET_COPILOT_DATA = "SET_COPILOT_DATA";

type AariDataRequestData = {
  aariDataRequest: "aari-data-request";
  processId: string;
  botId: string | null;
};

/**
 * Runtime message to set the Co-Pilot data per process id.
 */
export type SetCopilotDataMessage = {
  type: typeof SET_COPILOT_DATA;
  args: {
    data: Record<string, UnknownObject>;
  };
};

/**
 * Mapping from processId to form data.
 */
const hostData = new Map<string, UnknownObject>();

function isSetCopilotDataMessage(
  data?: UnknownObject,
): data is SetCopilotDataMessage {
  return data?.type === SET_COPILOT_DATA;
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
    if (isSetCopilotDataMessage(message)) {
      console.debug("Setting Co-Pilot data", message.args);

      hostData.clear();

      for (const [processId, data] of Object.entries(message.args.data)) {
        hostData.set(processId, data);
      }

      // Handled
      return true;
    }

    // Return undefined to indicate not handled
  });
}
